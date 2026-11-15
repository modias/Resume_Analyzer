from typing import Literal, Union
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
    analysis_id: int
    match_score: float
    required_coverage: float
    preferred_coverage: float
    quantified_impact: float
    extracted_skills: list[str]
    required_skills: list[SkillMatch]
    missing_skills: list[str]
    suggestions: list[OptimizationSuggestion]
    resume_text: str
    missing_preferred_skills: list[str] = []
    # Missing skills newly added to the user's learning plans by this analysis.
    added_to_learning: list[str] = []


class SuggestionsResponse(BaseModel):
    suggestions: list[OptimizationSuggestion]


class ResumeEntryItem(BaseModel):
    type: Literal["entry"]
    title: str = ""
    subtitle: str = ""
    location: str = ""
    date: str = ""
    bullets: list[str] = []


class ResumeProjectItem(BaseModel):
    type: Literal["project"]
    name: str = ""
    tech: str = ""
    date: str = ""
    bullets: list[str] = []


class ResumeSkillsItem(BaseModel):
    type: Literal["skills"]
    text: str = ""


ResumeSectionEntry = Union[ResumeEntryItem, ResumeProjectItem, ResumeSkillsItem]


class ResumeSectionSchema(BaseModel):
    title: str = ""
    entries: list[ResumeEntryItem | ResumeProjectItem | ResumeSkillsItem] = []


class StructuredResume(BaseModel):
    name: str = ""
    contact: str = ""
    sections: list[ResumeSectionSchema] = []


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
