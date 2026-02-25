import json
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.user import User
from app.models.analysis import Analysis
from app.schemas.dashboard import DashboardStats, StatCard, SkillCoverage, SkillGap
from app.services.auth import get_optional_user as get_current_user
from collections import Counter

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

_DEFAULT_SKILL_GAPS = [
    {"skill": "AWS",     "why": "Cloud computing is required in 78% of data science internships."},
    {"skill": "Tableau", "why": "Tableau is the most requested BI tool across Fortune 500 postings."},
    {"skill": "Spark",   "why": "Big data processing with Spark is frequently tested in interviews."},
    {"skill": "Docker",  "why": "Containerization signals production readiness for junior roles."},
]


@router.get("/stats", response_model=DashboardStats)
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Analysis)
        .where(Analysis.user_id == current_user.id)
        .order_by(Analysis.created_at.desc())
        .limit(10)
    )
    analyses = result.scalars().all()
    total = len(analyses)

    if not analyses:
        return DashboardStats(
            match_score=0.0,
            stat_cards=[
                StatCard(label="Required Skills Coverage", value=0, color="#6366f1"),
                StatCard(label="Preferred Skills Coverage", value=0, color="#8b5cf6"),
                StatCard(label="Quantified Impact", value=0, color="#ec4899"),
            ],
            skill_coverage=[],
            skill_gaps=[SkillGap(**g) for g in _DEFAULT_SKILL_GAPS],
            total_analyses=0,
            callback_rate=0.0,
        )

    latest = analyses[0]
    avg_score = sum(a.match_score for a in analyses) / total

    # Skill coverage from most recent analysis
    all_skills: list[str] = []
    all_missing: list[str] = []
    for a in analyses:
        all_skills.extend(json.loads(a.extracted_skills or "[]"))
        all_missing.extend(json.loads(a.missing_skills or "[]"))

    skill_freq = Counter(all_skills)
    top_skills = [
        SkillCoverage(skill=s, coverage=round(min(c / total * 100, 100), 1))
        for s, c in skill_freq.most_common(8)
    ]

    missing_freq = Counter(all_missing)
    skill_gaps = [
        SkillGap(
            skill=skill,
            why=f"Missing in {count} of your last {total} analyses. "
                "Add this skill to improve your match score.",
        )
        for skill, count in missing_freq.most_common(4)
    ]
    if not skill_gaps:
        skill_gaps = [SkillGap(**g) for g in _DEFAULT_SKILL_GAPS]

    callback_rate = round(min(avg_score * 0.25, 35), 1)

    return DashboardStats(
        match_score=round(latest.match_score, 1),
        stat_cards=[
            StatCard(label="Required Skills Coverage", value=round(latest.required_coverage, 1), color="#6366f1"),
            StatCard(label="Preferred Skills Coverage", value=round(latest.preferred_coverage, 1), color="#8b5cf6"),
            StatCard(label="Quantified Impact", value=round(latest.quantified_impact, 1), color="#ec4899"),
        ],
        skill_coverage=top_skills,
        skill_gaps=skill_gaps,
        total_analyses=total,
        callback_rate=callback_rate,
    )
