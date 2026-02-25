from fastapi import APIRouter, Query, Depends
from app.schemas.jobs import JobOut, DemandLevel
from app.services.auth import get_optional_user as get_current_user
from app.models.user import User

router = APIRouter(prefix="/jobs", tags=["jobs"])

# Static job data (mirrors frontend mock; replace with DB or external API later)
_JOBS: list[dict] = [
    {
        "id": 1, "company": "Google", "role": "Data Science Intern",
        "match_score": 82, "demand_level": "High", "apply_priority": "🔥 Apply Now",
        "required_skills": ["Python", "SQL", "Machine Learning", "GCP", "TensorFlow"],
        "market_frequency": 94, "salary_estimate": "$8,000 / mo",
    },
    {
        "id": 2, "company": "Meta", "role": "ML Engineering Intern",
        "match_score": 74, "demand_level": "High", "apply_priority": "⚡ Strong Fit",
        "required_skills": ["PyTorch", "Python", "C++", "Deep Learning", "SQL"],
        "market_frequency": 88, "salary_estimate": "$9,000 / mo",
    },
    {
        "id": 3, "company": "Stripe", "role": "Data Analyst Intern",
        "match_score": 68, "demand_level": "Medium", "apply_priority": "⚡ Strong Fit",
        "required_skills": ["SQL", "Python", "Tableau", "Statistics", "A/B Testing"],
        "market_frequency": 72, "salary_estimate": "$7,200 / mo",
    },
    {
        "id": 4, "company": "Airbnb", "role": "Analytics Engineering Intern",
        "match_score": 61, "demand_level": "Medium", "apply_priority": "📌 Consider",
        "required_skills": ["dbt", "SQL", "Python", "Spark", "Airflow"],
        "market_frequency": 65, "salary_estimate": "$7,500 / mo",
    },
    {
        "id": 5, "company": "Netflix", "role": "Research Scientist Intern",
        "match_score": 55, "demand_level": "Low", "apply_priority": "📌 Consider",
        "required_skills": ["R", "Python", "Statistics", "Machine Learning", "SQL"],
        "market_frequency": 58, "salary_estimate": "$8,500 / mo",
    },
    {
        "id": 6, "company": "Amazon", "role": "Business Intelligence Intern",
        "match_score": 79, "demand_level": "High", "apply_priority": "🔥 Apply Now",
        "required_skills": ["SQL", "Python", "AWS", "ETL", "Tableau"],
        "market_frequency": 85, "salary_estimate": "$7,800 / mo",
    },
]


@router.get("", response_model=list[JobOut])
async def list_jobs(
    q: str = Query("", description="Search by company or role"),
    demand: DemandLevel | None = Query(None, description="Filter by demand level"),
    min_score: float = Query(0, ge=0, le=100, description="Minimum match score"),
    _: User = Depends(get_current_user),
):
    results = _JOBS

    if q:
        ql = q.lower()
        results = [j for j in results if ql in j["company"].lower() or ql in j["role"].lower()]

    if demand:
        results = [j for j in results if j["demand_level"] == demand]

    results = [j for j in results if j["match_score"] >= min_score]

    return [JobOut(**j) for j in results]


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: int, _: User = Depends(get_current_user)):
    for job in _JOBS:
        if job["id"] == job_id:
            return JobOut(**job)
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Job not found")
