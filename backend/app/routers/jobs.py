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


def _score_for_skills(user_skills: list[str], required_skills: list[str]) -> int:
    if not required_skills:
        return 50
    user_lower = {s.lower() for s in user_skills if isinstance(s, str)}
    req_lower = {s.lower() for s in required_skills if isinstance(s, str)}
    if not req_lower:
        return 50
    matched = len(user_lower & req_lower)
    return min(100, max(10, round(matched / len(req_lower) * 100)))


def _priority_for_score(score: int) -> str:
    if score >= 75:
        return "🔥 Apply Now"
    if score >= 55:
        return "⚡ Strong Fit"
    return "📌 Consider"


def _rescore_mock_jobs(mock_jobs: list[dict], user_skills: list[str]) -> list[dict]:
    scored: list[dict] = []
    for job in mock_jobs:
        score = _score_for_skills(user_skills, job.get("required_skills", []))
        scored.append({
            **job,
            "match_score": score,
            "apply_priority": _priority_for_score(score),
            "market_frequency": min(99, score + 10),
        })
    scored.sort(key=lambda item: item["match_score"], reverse=True)
    return scored


# Mock data — used when RAPIDAPI_KEY is not configured
_MOCK_JOBS: list[dict] = [
    {
        "id": 1, "company": "Google", "role": "Data Science Intern",
        "match_score": 82, "demand_level": "High", "apply_priority": "🔥 Apply Now",
        "required_skills": ["Python", "SQL", "Machine Learning", "GCP", "TensorFlow"],
        "market_frequency": 94, "salary_estimate": "$8,000 / mo",
        "apply_link": "https://www.google.com/about/careers/applications/jobs/results/?q=Data%20Science%20Intern",
        "location": "Mountain View, CA",
        "employer_logo": "", "posted_at": "",
    },
    {
        "id": 2, "company": "Meta", "role": "ML Engineering Intern",
        "match_score": 74, "demand_level": "High", "apply_priority": "⚡ Strong Fit",
        "required_skills": ["PyTorch", "Python", "C++", "Deep Learning", "SQL"],
        "market_frequency": 88, "salary_estimate": "$9,000 / mo",
        "apply_link": "https://www.metacareers.com/jobs/?q=Machine%20Learning%20Intern",
        "location": "Menlo Park, CA",
        "employer_logo": "", "posted_at": "",
    },
    {
        "id": 3, "company": "Stripe", "role": "Data Analyst Intern",
        "match_score": 68, "demand_level": "Medium", "apply_priority": "⚡ Strong Fit",
        "required_skills": ["SQL", "Python", "Tableau", "Statistics", "A/B Testing"],
        "market_frequency": 72, "salary_estimate": "$7,200 / mo",
        "apply_link": "https://stripe.com/jobs/search?query=Data%20Analyst%20Intern",
        "location": "San Francisco, CA",
        "employer_logo": "", "posted_at": "",
    },
    {
        "id": 4, "company": "Airbnb", "role": "Analytics Engineering Intern",
        "match_score": 61, "demand_level": "Medium", "apply_priority": "📌 Consider",
        "required_skills": ["dbt", "SQL", "Python", "Spark", "Airflow"],
        "market_frequency": 65, "salary_estimate": "$7,500 / mo",
        "apply_link": "https://careers.airbnb.com/positions/?_roles=intern&_keywords=Analytics",
        "location": "San Francisco, CA",
        "employer_logo": "", "posted_at": "",
    },
    {
        "id": 5, "company": "Netflix", "role": "Research Scientist Intern",
        "match_score": 55, "demand_level": "Low", "apply_priority": "📌 Consider",
        "required_skills": ["R", "Python", "Statistics", "Machine Learning", "SQL"],
        "market_frequency": 58, "salary_estimate": "$8,500 / mo",
        "apply_link": "https://jobs.netflix.com/search?q=Research%20Scientist%20Intern",
        "location": "Los Gatos, CA",
        "employer_logo": "", "posted_at": "",
    },
    {
        "id": 6, "company": "Amazon", "role": "Business Intelligence Intern",
        "match_score": 79, "demand_level": "High", "apply_priority": "🔥 Apply Now",
        "required_skills": ["SQL", "Python", "AWS", "ETL", "Tableau"],
        "market_frequency": 85, "salary_estimate": "$7,800 / mo",
        "apply_link": "https://www.amazon.jobs/en/search?base_query=Business%20Intelligence%20Intern",
        "location": "Seattle, WA",
        "employer_logo": "", "posted_at": "",
    },
]


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

    # Do not silently force mock jobs when live providers return nothing.
    # Returning an empty list is clearer than showing a fixed set of fake jobs.
    results: list[dict] = live_jobs

    # Client-side filters
    if q:
        ql = q.lower()
        results = [j for j in results if ql in j["company"].lower() or ql in j["role"].lower()]
    if demand:
        results = [j for j in results if j["demand_level"] == demand]
    results = [j for j in results if j["match_score"] >= min_score]

    return [JobOut(**j) for j in results]


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: int, _: User = Depends(get_current_user)):
    for job in _MOCK_JOBS:
        if job["id"] == job_id:
            return JobOut(**job)
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Job not found")
