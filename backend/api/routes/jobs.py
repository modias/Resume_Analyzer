from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Literal

router = APIRouter()


class Job(BaseModel):
    id: int
    company: str
    role: str
    matchScore: int
    demandLevel: Literal["High", "Medium", "Low"]
    applyPriority: Literal["🔥 Apply Now", "⚡ Strong Fit", "📌 Consider"]
    requiredSkills: list[str]
    marketFrequency: int
    salaryEstimate: str


_JOBS: list[Job] = [
    Job(
        id=1,
        company="Google",
        role="Data Science Intern",
        matchScore=82,
        demandLevel="High",
        applyPriority="🔥 Apply Now",
        requiredSkills=["Python", "SQL", "Machine Learning", "BigQuery", "TensorFlow"],
        marketFrequency=94,
        salaryEstimate="$8,000 / mo",
    ),
    Job(
        id=2,
        company="Meta",
        role="ML Engineering Intern",
        matchScore=74,
        demandLevel="High",
        applyPriority="⚡ Strong Fit",
        requiredSkills=["PyTorch", "Python", "C++", "Distributed Systems", "SQL"],
        marketFrequency=88,
        salaryEstimate="$9,000 / mo",
    ),
    Job(
        id=3,
        company="Stripe",
        role="Data Analyst Intern",
        matchScore=68,
        demandLevel="Medium",
        applyPriority="⚡ Strong Fit",
        requiredSkills=["SQL", "Python", "Tableau", "Statistics", "A/B Testing"],
        marketFrequency=72,
        salaryEstimate="$7,200 / mo",
    ),
    Job(
        id=4,
        company="Airbnb",
        role="Analytics Engineering Intern",
        matchScore=61,
        demandLevel="Medium",
        applyPriority="📌 Consider",
        requiredSkills=["dbt", "SQL", "Python", "Spark", "Airflow"],
        marketFrequency=65,
        salaryEstimate="$7,500 / mo",
    ),
    Job(
        id=5,
        company="Netflix",
        role="Research Scientist Intern",
        matchScore=55,
        demandLevel="Low",
        applyPriority="📌 Consider",
        requiredSkills=["R", "Python", "Statistics", "Causal Inference", "SQL"],
        marketFrequency=58,
        salaryEstimate="$8,500 / mo",
    ),
    Job(
        id=6,
        company="Amazon",
        role="Business Intelligence Intern",
        matchScore=79,
        demandLevel="High",
        applyPriority="🔥 Apply Now",
        requiredSkills=["SQL", "Python", "QuickSight", "AWS", "ETL"],
        marketFrequency=85,
        salaryEstimate="$7,800 / mo",
    ),
]


@router.get("/jobs", response_model=list[Job])
async def get_jobs(
    demand: str | None = Query(None, description="Filter by demand level: High, Medium, Low"),
    min_match: int = Query(0, ge=0, le=100, description="Minimum match score"),
) -> list[Job]:
    """Return job listings, optionally filtered by demand level and minimum match score."""
    from api.routes.analyze import get_latest_result

    result = get_latest_result()
    jobs = list(_JOBS)

    # If we have a real analysis result, update match scores based on resume skills
    if result:
        resume_lower = {s.lower() for s in result.extracted_skills}
        for job in jobs:
            matched = sum(1 for s in job.requiredSkills if s.lower() in resume_lower)
            if job.requiredSkills:
                score = round(matched / len(job.requiredSkills) * 100)
                job = job.model_copy(update={"matchScore": score})
            jobs[jobs.index(next(j for j in _JOBS if j.id == job.id))] = job

    # Apply filters
    if demand:
        jobs = [j for j in jobs if j.demandLevel.lower() == demand.lower()]
    jobs = [j for j in jobs if j.matchScore >= min_match]

    return sorted(jobs, key=lambda j: j.matchScore, reverse=True)
