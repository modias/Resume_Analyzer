import json
import logging
import datetime
import urllib.parse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.log import UserLog
from app.schemas.user import (
    UserRegister,
    UserLogin,
    TokenOut,
    UserOut,
    UserUpdate,
    VerifyEmailRequest,
    ResendVerificationRequest,
    UserLogOut,
)
from app.config import get_settings
from app.services.auth import hash_password, verify_password, create_access_token, get_current_user
from app.services.email import generate_verification_code, send_verification_email, CODE_EXPIRY_MINUTES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        school=user.school,
        major=user.major,
        skills=json.loads(user.skills or "[]"),
        dream_companies=json.loads(user.dream_companies or "[]"),
        dream_job=user.dream_job or "",
        is_verified=bool(user.is_verified),
        created_at=user.created_at,
    )


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


async def _log(db: AsyncSession, user_id: int, action: str, detail: str = "", ip: str | None = None) -> None:
    entry = UserLog(user_id=user_id, action=action, detail=detail, ip_address=ip)
    db.add(entry)
    await db.flush()
    logger.info("user_log | user_id=%s action=%s detail=%s ip=%s", user_id, action, detail, ip)


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------

@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
async def register(body: UserRegister, request: Request, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    code = generate_verification_code()
    expires = datetime.datetime.utcnow() + datetime.timedelta(minutes=CODE_EXPIRY_MINUTES)

    user = User(
        name=body.name,
        email=body.email,
        hashed_password=hash_password(body.password),
        school=body.school,
        major=body.major,
        skills=json.dumps(body.skills),
        dream_companies=json.dumps(body.dream_companies),
        dream_job=body.dream_job,
        is_verified=False,
        verification_code=code,
        verification_expires_at=expires,
    )
    db.add(user)
    await db.flush()  # get user.id before logging

    await _log(db, user.id, "register", f"email={body.email}", _client_ip(request))
    await db.commit()
    await db.refresh(user)

    # Send verification email (non-blocking failure — don't block registration)
    try:
        await send_verification_email(body.email, code, body.name)
    except Exception as exc:
        logger.warning("Failed to send verification email to %s: %s", body.email, exc)

    token = create_access_token({"sub": str(user.id)})
    return TokenOut(access_token=token, user=_to_user_out(user))


# ---------------------------------------------------------------------------
# Verify email
# ---------------------------------------------------------------------------

@router.post("/verify-email", response_model=UserOut)
async def verify_email(body: VerifyEmailRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_verified:
        return _to_user_out(user)

    if not user.verification_code or user.verification_code != body.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    if user.verification_expires_at and datetime.datetime.utcnow() > user.verification_expires_at:
        raise HTTPException(status_code=400, detail="Verification code has expired — request a new one")

    user.is_verified = True
    user.verification_code = None
    user.verification_expires_at = None

    await _log(db, user.id, "email_verified", f"email={body.email}", _client_ip(request))
    await db.commit()
    await db.refresh(user)

    return _to_user_out(user)


# ---------------------------------------------------------------------------
# Resend verification code
# ---------------------------------------------------------------------------

@router.post("/resend-verification", status_code=status.HTTP_200_OK)
async def resend_verification(body: ResendVerificationRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    # Always return 200 to avoid exposing whether the email is registered
    if not user or user.is_verified:
        return {"message": "If that email is registered and unverified, a new code has been sent."}

    code = generate_verification_code()
    expires = datetime.datetime.utcnow() + datetime.timedelta(minutes=CODE_EXPIRY_MINUTES)
    user.verification_code = code
    user.verification_expires_at = expires

    await _log(db, user.id, "resend_verification", f"email={body.email}", _client_ip(request))
    await db.commit()

    try:
        await send_verification_email(body.email, code, user.name)
    except Exception as exc:
        logger.warning("Failed to resend verification email to %s: %s", body.email, exc)

    return {"message": "If that email is registered and unverified, a new code has been sent."}


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

@router.post("/login", response_model=TokenOut)
async def login(body: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        logger.warning("Failed login attempt for email=%s ip=%s", body.email, _client_ip(request))
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await _log(db, user.id, "login", f"email={body.email}", _client_ip(request))
    await db.commit()

    token = create_access_token({"sub": str(user.id)})
    return TokenOut(access_token=token, user=_to_user_out(user))


# ---------------------------------------------------------------------------
# Current user
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return _to_user_out(current_user)


@router.patch("/me", response_model=UserOut)
async def update_me(
    body: UserUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.name is not None:
        current_user.name = body.name
    if body.school is not None:
        current_user.school = body.school
    if body.major is not None:
        current_user.major = body.major
    if body.skills is not None:
        current_user.skills = json.dumps(body.skills)
    if body.dream_companies is not None:
        current_user.dream_companies = json.dumps(body.dream_companies)
    if body.dream_job is not None:
        current_user.dream_job = body.dream_job

    await _log(db, current_user.id, "profile_update", "", _client_ip(request))
    await db.commit()
    await db.refresh(current_user)
    return _to_user_out(current_user)


# ---------------------------------------------------------------------------
# Delete account
# ---------------------------------------------------------------------------

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _log(db, current_user.id, "account_deleted", f"email={current_user.email}", _client_ip(request))
    await db.flush()
    await db.delete(current_user)
    await db.commit()


# ---------------------------------------------------------------------------
# LinkedIn OAuth
# ---------------------------------------------------------------------------

_LI_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
_LI_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
_LI_USERINFO_URL = "https://api.linkedin.com/v2/userinfo"


@router.get("/linkedin")
async def linkedin_login():
    """Redirect the user to LinkedIn's authorization page."""
    s = get_settings()
    if not s.linkedin_client_id:
        raise HTTPException(status_code=503, detail="LinkedIn OAuth is not configured on this server.")
    redirect_uri = "http://localhost:8000/auth/linkedin/callback"
    params = {
        "response_type": "code",
        "client_id": s.linkedin_client_id,
        "redirect_uri": redirect_uri,
        "scope": "openid profile email",
    }
    url = f"{_LI_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=url)


@router.get("/linkedin/callback")
async def linkedin_callback(
    code: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Exchange LinkedIn auth code for a user profile and issue a JWT."""
    s = get_settings()
    frontend_url = s.frontend_url or "http://localhost:3000"

    if error or not code:
        return RedirectResponse(url=f"{frontend_url}/login?li_error=access_denied")

    redirect_uri = "http://localhost:8000/auth/linkedin/callback"

    # 1. Exchange code for access token
    try:
        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                _LI_TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": s.linkedin_client_id,
                    "client_secret": s.linkedin_client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10,
            )
            if not token_resp.is_success:
                logger.warning(
                    "LinkedIn token exchange failed: status=%s body=%s",
                    token_resp.status_code,
                    token_resp.text,
                )
                return RedirectResponse(url=f"{frontend_url}/login?li_error=oauth_failed")

            access_token = token_resp.json()["access_token"]

            # 2. Fetch LinkedIn profile via OpenID Connect userinfo
            profile_resp = await client.get(
                _LI_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            )
            if not profile_resp.is_success:
                logger.warning(
                    "LinkedIn userinfo failed: status=%s body=%s",
                    profile_resp.status_code,
                    profile_resp.text,
                )
                return RedirectResponse(url=f"{frontend_url}/login?li_error=oauth_failed")

            profile = profile_resp.json()
    except Exception as exc:
        logger.warning("LinkedIn OAuth exception: %s", exc)
        return RedirectResponse(url=f"{frontend_url}/login?li_error=oauth_failed")

    li_id: str = profile.get("sub", "")
    email: str = profile.get("email", "")
    name: str = profile.get("name", profile.get("given_name", "LinkedIn User"))

    if not li_id:
        return RedirectResponse(url=f"{frontend_url}/login?li_error=no_profile")

    # 3. Find or create user
    user: User | None = None

    # Try by linkedin_id first
    result = await db.execute(select(User).where(User.linkedin_id == li_id))
    user = result.scalar_one_or_none()

    # Try by email if we have one
    if not user and email:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            user.linkedin_id = li_id

    # Create new user
    if not user:
        fallback_email = email or f"li_{li_id}@linkedin.local"
        user = User(
            name=name,
            email=fallback_email,
            hashed_password="",
            linkedin_id=li_id,
            is_verified=True,
        )
        db.add(user)
        await db.flush()
        logger.info("New LinkedIn user created: id=%s email=%s", user.id, fallback_email)

    await db.commit()
    await db.refresh(user)

    # 4. Issue JWT and redirect to frontend
    jwt = create_access_token({"sub": str(user.id)})
    user_out = _to_user_out(user)
    encoded_user = urllib.parse.quote(user_out.model_dump_json())
    return RedirectResponse(url=f"{frontend_url}/login?token={jwt}&user={encoded_user}")


# ---------------------------------------------------------------------------
# Activity logs
# ---------------------------------------------------------------------------

@router.get("/me/logs", response_model=list[UserLogOut])
async def my_logs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserLog)
        .where(UserLog.user_id == current_user.id)
        .order_by(UserLog.created_at.desc())
        .limit(100)
    )
    return result.scalars().all()
