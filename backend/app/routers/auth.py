import json
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.log import UserLog
from app.schemas.user import UserOut, UserUpdate, UserLogOut
from app.services.auth import delete_clerk_user, get_current_user

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
    if current_user.clerk_id:
        try:
            await delete_clerk_user(current_user.clerk_id)
        except httpx.HTTPError as exc:
            logger.warning("Clerk user deletion failed for %s: %s", current_user.clerk_id, exc)
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not delete your sign-in account.")

    await _log(db, current_user.id, "account_deleted", f"email={current_user.email}", _client_ip(request))
    await db.flush()
    await db.delete(current_user)
    await db.commit()


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
