from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.learning import LearningPlan


def skill_key(skill: str) -> str:
    return " ".join(skill.lower().split())


async def queue_missing_skills(
    db: AsyncSession,
    user_id: int,
    required_missing: list[str],
    preferred_missing: list[str],
) -> list[str]:
    """
    Add each missing skill as a not-yet-started learning plan (no lessons).
    Skills the user already has a plan for are left untouched, except that a
    still-empty analysis plan is promoted to High priority if it becomes required.
    Caller commits.
    """
    wanted: dict[str, tuple[str, str]] = {}
    for skill in required_missing:
        wanted.setdefault(skill_key(skill), (skill, "High"))
    for skill in preferred_missing:
        wanted.setdefault(skill_key(skill), (skill, "Medium"))
    if not wanted:
        return []

    result = await db.execute(
        select(LearningPlan).where(
            LearningPlan.user_id == user_id,
            LearningPlan.skill_key.in_(list(wanted)),
        )
    )
    existing = {p.skill_key: p for p in result.scalars().all()}

    added: list[str] = []
    for key, (skill, priority) in wanted.items():
        plan = existing.get(key)
        if plan is None:
            db.add(
                LearningPlan(
                    user_id=user_id,
                    skill=skill,
                    skill_key=key,
                    source="analysis",
                    priority=priority,
                )
            )
            added.append(skill)
        elif plan.source == "analysis" and priority == "High" and plan.priority != "High":
            plan.priority = "High"
    return added
