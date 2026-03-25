from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.application import Application
from app.models.user import User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationOut,
    TimelinePoint,
    VALID_STATUSES,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
async def log_application(
    body: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {sorted(VALID_STATUSES)}")

    app = Application(
        user_id=current_user.id,
        company=body.company.strip(),
        role=body.role.strip(),
        status=body.status,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app


@router.patch("/{app_id}", response_model=ApplicationOut)
async def update_application_status(
    app_id: int,
    body: ApplicationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {sorted(VALID_STATUSES)}")

    result = await db.execute(
        select(Application).where(
            Application.id == app_id,
            Application.user_id == current_user.id,
        )
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app.status = body.status
    await db.commit()
    await db.refresh(app)
    return app


@router.get("", response_model=list[ApplicationOut])
async def list_applications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Application)
        .where(Application.user_id == current_user.id)
        .order_by(Application.applied_at.desc())
    )
    return result.scalars().all()


@router.get("/timeline", response_model=list[TimelinePoint])
async def application_timeline(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Application)
        .where(Application.user_id == current_user.id)
        .order_by(Application.applied_at.asc())
    )
    apps = result.scalars().all()

    if not apps:
        return []

    # Group counts by ISO year-week string (e.g. "2024-W03")
    week_apps: dict[str, int] = defaultdict(int)
    week_callbacks: dict[str, int] = defaultdict(int)

    for a in apps:
        dt = a.applied_at
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        iso = dt.isocalendar()
        week_key = f"{iso.year}-W{iso.week:02d}"
        week_apps[week_key] += 1
        if a.status in ("callback", "offer"):
            week_callbacks[week_key] += 1

    # Sort weeks chronologically
    all_weeks = sorted(set(week_apps) | set(week_callbacks))

    # Build cumulative timeline
    timeline: list[TimelinePoint] = []
    cum_apps = 0
    cum_callbacks = 0
    for i, wk in enumerate(all_weeks):
        cum_apps += week_apps.get(wk, 0)
        cum_callbacks += week_callbacks.get(wk, 0)
        # Display label: "Week 1", "Week 2", ...
        timeline.append(TimelinePoint(
            week=f"Week {i + 1}",
            applications=cum_apps,
            callbacks=cum_callbacks,
        ))

    return timeline
