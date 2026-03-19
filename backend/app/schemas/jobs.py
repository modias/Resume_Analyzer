from pydantic import BaseModel
from typing import Literal


DemandLevel = Literal["High", "Medium", "Low"]
ApplyPriority = Literal["🔥 Apply Now", "⚡ Strong Fit", "📌 Consider"]


class JobOut(BaseModel):
    id: int
    company: str
    role: str
    match_score: float
    demand_level: DemandLevel
    apply_priority: ApplyPriority
    required_skills: list[str]
    market_frequency: float
    salary_estimate: str
    # enriched fields (empty string when not available)
    apply_link: str = ""
    location: str = ""
    employer_logo: str = ""
    posted_at: str = ""
