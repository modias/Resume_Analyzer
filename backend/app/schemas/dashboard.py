from pydantic import BaseModel


class StatCard(BaseModel):
    label: str
    value: float
    color: str


class SkillCoverage(BaseModel):
    skill: str
    coverage: float


class SkillGap(BaseModel):
    skill: str
    why: str


class DashboardStats(BaseModel):
    match_score: float
    stat_cards: list[StatCard]
    skill_coverage: list[SkillCoverage]
    skill_gaps: list[SkillGap]
    total_analyses: int
    callback_rate: float
    job_title: str
    company: str
    job_summary: str
