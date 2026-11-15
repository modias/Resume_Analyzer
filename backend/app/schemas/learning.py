from typing import Literal

from pydantic import BaseModel, Field


class RecommendedSkill(BaseModel):
    skill: str
    priority: str  # "High" (missing required) | "Medium" (missing preferred)
    progress: float  # 0-100, lessons completed / total
    plan_id: int | None = None


class PlanSummary(BaseModel):
    id: int
    skill: str
    progress: float
    completed_lessons: int
    total_lessons: int  # 0 = added from an analysis, roadmap not generated yet
    source: str
    priority: str


class LearningOverview(BaseModel):
    target_role: str
    has_analysis: bool
    readiness: float | None
    covered: int
    total: int
    in_progress: int
    to_learn: int
    recommended: list[RecommendedSkill]
    plans: list[PlanSummary]


class CreatePlanRequest(BaseModel):
    skill: str = Field(min_length=1, max_length=120)
    level: Literal["", "beginner", "intermediate", "advanced"] = ""
    goal: str = Field(default="", max_length=300)


class LessonOut(BaseModel):
    id: int
    position: int
    title: str
    description: str
    duration: str
    completed: bool
    has_notes: bool


class PlanOut(BaseModel):
    id: int
    skill: str
    summary: str
    level: str
    goal: str
    progress: float
    lessons: list[LessonOut]


class LessonDetail(LessonOut):
    plan_id: int
    skill: str
    notes: dict


class CompleteLessonRequest(BaseModel):
    completed: bool = True
