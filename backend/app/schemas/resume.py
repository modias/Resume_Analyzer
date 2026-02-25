from pydantic import BaseModel
import datetime


class SkillMatch(BaseModel):
    skill: str
    present: bool


class OptimizationSuggestion(BaseModel):
    original: str
    suggested: str
    reason: str


class AnalyzeResponse(BaseModel):
    match_score: float
    required_coverage: float
    preferred_coverage: float
    quantified_impact: float
    extracted_skills: list[str]
    required_skills: list[SkillMatch]
    missing_skills: list[str]
    suggestions: list[OptimizationSuggestion]


class AnalysisOut(BaseModel):
    id: int
    resume_filename: str
    job_title: str
    company: str
    match_score: float
    required_coverage: float
    preferred_coverage: float
    quantified_impact: float
    extracted_skills: list[str]
    missing_skills: list[str]
    suggestions: list[OptimizationSuggestion]
    created_at: datetime.datetime

    model_config = {"from_attributes": True}
