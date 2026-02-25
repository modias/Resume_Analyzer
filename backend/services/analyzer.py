"""
Main analysis orchestrator — ties together PDF parsing, skill extraction,
match scoring, and optimization suggestions into a single AnalysisResult.
"""
from schemas.analysis import AnalysisResult
from core.pdf_parser import extract_text_from_pdf
from core.config import get_settings
from services.skill_extractor import extract_skills, extract_required_skills_from_jd
from services.matcher import (
    calculate_match_score,
    build_required_skills_list,
    build_skill_gaps,
    build_skill_breakdowns,
    build_skill_coverage,
    build_stat_cards,
)
from services.optimizer import generate_optimization_suggestions


async def analyze_resume(pdf_bytes: bytes, jd_text: str) -> AnalysisResult:
    """Full pipeline: PDF → text → skills → score → suggestions."""
    settings = get_settings()

    # 1. Extract resume text
    resume_text = await extract_text_from_pdf(pdf_bytes)

    # 2. Extract skills from both documents
    resume_skills = extract_skills(resume_text)
    jd_skills = extract_required_skills_from_jd(jd_text)

    # 3. Score and gap analysis
    match_score = calculate_match_score(resume_skills, jd_skills)
    required_skills = build_required_skills_list(resume_skills, jd_skills)
    skill_gaps = build_skill_gaps(resume_skills, jd_skills)
    skill_breakdowns = build_skill_breakdowns(skill_gaps)
    skill_coverage = build_skill_coverage(resume_skills, jd_skills)
    stat_cards = build_stat_cards(resume_skills, jd_skills, resume_text)

    # 4. Optimization suggestions (async — may call OpenAI)
    suggestions = await generate_optimization_suggestions(
        resume_text=resume_text,
        jd_text=jd_text,
        jd_skills=jd_skills,
        api_key=settings.openai_api_key,
        model=settings.openai_model,
    )

    return AnalysisResult(
        match_score=match_score,
        extracted_skills=resume_skills,
        required_skills=required_skills,
        optimization_suggestions=suggestions,
        skill_coverage=skill_coverage,
        skill_gaps=skill_gaps,
        skill_breakdowns=skill_breakdowns,
        stat_cards=stat_cards,
    )
