import json
import logging
from typing import Literal

from fastapi import APIRouter, Query, Depends
from app.schemas.jobs import JobOut, DemandLevel
from app.services.auth import get_optional_user as get_current_user
from app.services.jobs_fetcher import fetch_linkedin_jobs
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["jobs"])

EmploymentType = Literal["INTERN", "FULLTIME", "PARTTIME", "CONTRACTOR"]
DatePosted = Literal["all", "today", "3days", "week", "month"]


@router.get("", response_model=list[JobOut])
async def list_jobs(
    # Live search / API params (sent to JSearch)
    search: str = Query("", description="Job title or keyword (overrides dream job default)"),
    location: str = Query("", description="City, state or country (e.g. 'New York, NY')"),
    employment_type: EmploymentType = Query("INTERN", description="INTERN | FULLTIME | PARTTIME | CONTRACTOR"),
    date_posted: DatePosted = Query("week", description="all | today | 3days | week | month"),
    remote_only: bool = Query(False, description="Return only remote positions"),
    page: int = Query(1, ge=1, description="Page number for pagination"),
    # Client-side filters (applied after fetching)
    q: str = Query("", description="Filter results by company or role name"),
    demand: DemandLevel | None = Query(None, description="Filter by demand level"),
    min_score: float = Query(0, ge=0, le=100, description="Minimum match score"),
    current_user: User = Depends(get_current_user),
):
    user_skills: list[str] = json.loads(current_user.skills or "[]")

    # Build the JSearch query: use explicit search param, else fall back to
    # dream job + a few resume-derived skills for better relevance.
    if search.strip():
        api_query = search.strip()
        if employment_type == "INTERN":
            lowered = api_query.lower()
            if "intern" not in lowered and "internship" not in lowered:
                api_query = f"{api_query} internship"
    else:
        dream_job = current_user.dream_job or "software engineer"
        suffix = "" if employment_type != "INTERN" else " intern"
        top_skills = [s for s in user_skills if isinstance(s, str) and s.strip()][:3]
        skill_terms = " ".join(top_skills)
        api_query = f"{dream_job}{suffix} {skill_terms}".strip()

    live_jobs = await fetch_linkedin_jobs(
        query=api_query,
        user_skills=user_skills,
        location=location,
        employment_type=employment_type,
        date_posted=date_posted,
        remote_only=remote_only,
        page=page,
        num_pages=5,
    )

    # If strict recency returns nothing, retry once with broader recency.
    if not live_jobs and date_posted != "all":
        live_jobs = await fetch_linkedin_jobs(
            query=api_query,
            user_skills=user_skills,
            location=location,
            employment_type=employment_type,
            date_posted="all",
            remote_only=remote_only,
            page=page,
            num_pages=5,
        )

    results: list[dict] = live_jobs

    # Client-side filters
    if q:
        ql = q.lower()
        results = [j for j in results if ql in j["company"].lower() or ql in j["role"].lower()]
    if demand:
        results = [j for j in results if j["demand_level"] == demand]
    results = [j for j in results if j["match_score"] >= min_score]

    return [JobOut(**j) for j in results]

