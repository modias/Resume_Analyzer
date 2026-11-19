import asyncio
import logging

import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.log import UserLog
from app.models.user import User

logger = logging.getLogger(__name__)
settings = get_settings()

# auto_error=False means FastAPI won't raise 401 when the header is missing
bearer_scheme = HTTPBearer(auto_error=False)

_CLERK_API = "https://api.clerk.com/v1"
_GUEST_EMAIL = "guest@localhost"

_jwks_client: jwt.PyJWKClient | None = None


def _clerk_headers() -> dict[str, str]:
    if not settings.clerk_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Clerk is not configured on this server (set CLERK_SECRET_KEY).",
        )
    return {
        "Authorization": f"Bearer {settings.clerk_secret_key}",
        "User-Agent": "careercore-api",
    }


def _get_jwks_client() -> jwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = jwt.PyJWKClient(
            f"{_CLERK_API}/jwks", headers=_clerk_headers(), cache_jwk_set=True, lifespan=3600
        )
    return _jwks_client


def _decode_session_token(token: str) -> dict:
    """Verify a Clerk session token and return its claims."""
    signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
    claims = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        options={"require": ["exp", "iat", "sub"]},
        leeway=5,
    )
    azp = claims.get("azp")
    if azp and azp not in settings.origins_list:
        raise jwt.InvalidTokenError(f"Unauthorized party: {azp}")
    return claims


async def _fetch_clerk_user(clerk_id: str) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{_CLERK_API}/users/{clerk_id}", headers=_clerk_headers())
        resp.raise_for_status()
        return resp.json()


async def delete_clerk_user(clerk_id: str) -> None:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.delete(f"{_CLERK_API}/users/{clerk_id}", headers=_clerk_headers())
        if resp.status_code != 404:
            resp.raise_for_status()


def _primary_email(profile: dict) -> tuple[str, bool]:
    primary_id = profile.get("primary_email_address_id")
    for entry in profile.get("email_addresses") or []:
        if entry.get("id") == primary_id:
            verified = (entry.get("verification") or {}).get("status") == "verified"
            return entry.get("email_address", ""), verified
    return "", False


async def _user_for_clerk_id(db: AsyncSession, clerk_id: str) -> User:
    """Find the app user for a Clerk user, linking or creating it on first sign-in."""
    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()
    if user:
        return user

    try:
        profile = await _fetch_clerk_user(clerk_id)
    except httpx.HTTPError as exc:
        logger.warning("Clerk user lookup failed for %s: %s", clerk_id, exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not load your Clerk profile.")

    email, verified = _primary_email(profile)
    name = " ".join(p for p in (profile.get("first_name"), profile.get("last_name")) if p)
    name = name or profile.get("username") or (email.split("@")[0] if email else "") or "New User"

    existing = None
    if email:
        result = await db.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()

    # Only a verified email may claim a pre-Clerk account, so nobody can take over
    # an existing account by signing up with someone else's address.
    if existing and existing.clerk_id is None and verified:
        existing.clerk_id = clerk_id
        existing.is_verified = True
        user = existing
        action = "clerk_link"
    else:
        user = User(
            name=name,
            email=email if email and not existing else f"{clerk_id}@clerk.local",
            clerk_id=clerk_id,
            is_verified=verified,
        )
        db.add(user)
        action = "register"

    try:
        await db.flush()
        db.add(UserLog(user_id=user.id, action=action, detail=f"email={email}"))
        await db.commit()
    except IntegrityError:
        # A concurrent request created this user first.
        await db.rollback()
        result = await db.execute(select(User).where(User.clerk_id == clerk_id))
        return result.scalar_one()

    await db.refresh(user)
    return user


async def _user_from_credentials(db: AsyncSession, token: str) -> User:
    try:
        claims = await asyncio.to_thread(_decode_session_token, token)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await _user_for_clerk_id(db, claims["sub"])


async def _get_or_create_guest(db: AsyncSession) -> User:
    """Return the shared guest user, creating it on first use."""
    result = await db.execute(select(User).where(User.email == _GUEST_EMAIL))
    guest = result.scalar_one_or_none()
    if guest is None:
        guest = User(name="Guest", email=_GUEST_EMAIL, school="", major="")
        db.add(guest)
        await db.commit()
        await db.refresh(guest)
    return guest


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Require a valid Clerk session token. Raises 401 if missing or invalid."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await _user_from_credentials(db, credentials.credentials)


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Return the authenticated user when a session token is present.
    Fall back to the shared guest account when no token is provided,
    so all endpoints work without signing in.
    """
    if not credentials:
        return await _get_or_create_guest(db)
    return await _user_from_credentials(db, credentials.credentials)
