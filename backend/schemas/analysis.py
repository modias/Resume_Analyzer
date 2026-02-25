from pydantic import BaseModel
from typing import Literal


class SkillMatch(BaseModel):
    skill: str
    present: bool


class OptimizationSuggestion(BaseModel):
    original: str
    suggested: str


class SkillCoverage(BaseModel):
    skill: str
    coverage: int  # 0-100


class SkillGap(BaseModel):
    skill: str
    why: str


class SkillBreakdownResource(BaseModel):
    label: str
    type: Literal["Course", "Docs", "Project", "Book"]


class SkillBreakdown(BaseModel):
    skill: str
    category: str
    marketDemand: int
    scoreImpact: int
    estimatedHours: int
    description: str
    roles: list[str]
    relatedSkills: list[str]
    resources: list[SkillBreakdownResource]


class StatCard(BaseModel):
    label: str
    value: int
    color: str


class AnalysisResult(BaseModel):
    match_score: int
    extracted_skills: list[str]
    required_skills: list[SkillMatch]
    optimization_suggestions: list[OptimizationSuggestion]
    skill_coverage: list[SkillCoverage]
    skill_gaps: list[SkillGap]
    skill_breakdowns: dict[str, SkillBreakdown]
    stat_cards: list[StatCard]


class DashboardResponse(BaseModel):
    has_analysis: bool
    match_score: int
    stat_cards: list[StatCard]
    skill_coverage: list[SkillCoverage]
    skill_gaps: list[SkillGap]
    skill_breakdowns: dict[str, SkillBreakdown]
