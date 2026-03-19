import json
import logging

from fastapi import APIRouter, Query, Depends
from app.schemas.jobs import JobOut, DemandLevel
from app.services.auth import get_optional_user as get_current_user
from app.services.jobs_fetcher import fetch_linkedin_jobs
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["jobs"])

# Mock data — used when RAPIDAPI_KEY is not configured
_MOCK_JOBS: list[dict] = [
    {
        "id": 1, "company": "Google", "role": "Data Science Intern",
        "match_score": 82, "demand_level": "High", "apply_priority": "🔥 Apply Now",
        "required_skills": ["Python", "SQL", "Machine Learning", "GCP", "TensorFlow"],
        "market_frequency": 94, "salary_estimate": "$8,000 / mo",
        "apply_link": "https://careers.google.com", "location": "Mountain View, CA",
        "employer_logo": "", "posted_at": "",
    },
    {
        "id": 2, "company": "Meta", "role": "ML Engineering Intern",
        "match_score": 74, "demand_level": "High", "apply_priority": "⚡ Strong Fit",
        "required_skills": ["PyTorch", "Python", "C++", "Deep Learning", "SQL"],
        "market_frequency": 88, "salary_estimate": "$9,000 / mo",
        "apply_link": "https://www.metacareers.com", "location": "Menlo Park, CA",
        "employer_logo": "", "posted_at": "",
    },
    {
        "id": 3, "company": "Stripe", "role": "Data Analyst Intern",
        "match_score": 68, "demand_level": "Medium", "apply_priority": "⚡ Strong Fit",
        "required_skills": ["SQL", "Python", "Tableau", "Statistics", "A/B Testing"],
        "market_frequency": 72, "salary_estimate": "$7,200 / mo",
        "apply_link": "https://stripe.com/jobs", "location": "San Francisco, CA",
        "employer_logo": "", "posted_at": "",
    },
    {
        "id": 4, "company": "Airbnb", "role": "Analytics Engineering Intern",
        "match_score": 61, "demand_level": "Medium", "apply_priority": "📌 Consider",
        "required_skills": ["dbt", "SQL", "Python", "Spark", "Airflow"],
        "market_frequency": 65, "salary_estimate": "$7,500 / mo",
        "apply_link": "https://careers.airbnb.com", "location": "San Francisco, CA",
        "employer_logo": "", "posted_at": "",
    },
    {
        "id": 5, "company": "Netflix", "role": "Research Scientist Intern",
        "match_score": 55, "demand_level": "Low", "apply_priority": "📌 Consider",
        "required_skills": ["R", "Python", "Statistics", "Machine Learning", "SQL"],
        "market_frequency": 58, "salary_estimate": "$8,500 / mo",
        "apply_link": "https://jobs.netflix.com", "location": "Los Gatos, CA",
        "employer_logo": "", "posted_at": "",
    },
    {
        "id": 6, "company": "Amazon", "role": "Business Intelligence Intern",
        "match_score": 79, "demand_level": "High", "apply_priority": "🔥 Apply Now",
        "required_skills": ["SQL", "Python", "AWS", "ETL", "Tableau"],
        "market_frequency": 85, "salary_estimate": "$7,800 / mo",
        "apply_link": "https://www.amazon.jobs", "location": "Seattle, WA",
        "employer_logo": "", "posted_at": "",
    },
]


@router.get("", response_model=list[JobOut])
async def list_jobs(
    q: str = Query("", description="Search by company or role"),
    demand: DemandLevel | None = Query(None, description="Filter by demand level"),
    min_score: float = Query(0, ge=0, le=100, description="Minimum match score"),
    current_user: User = Depends(get_current_user),
):
    user_skills: list[str] = json.loads(current_user.skills or "[]")

    # Build search query from user's dream job + generic intern term
    dream_job = current_user.dream_job or "software engineer"
    search_query = f"{dream_job} intern"

    # Try live LinkedIn/Indeed data via JSearch
    live_jobs = await fetch_linkedin_jobs(search_query, user_skills)

    results: list[dict] = live_jobs if live_jobs else _MOCK_JOBS

    # Apply filters
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
