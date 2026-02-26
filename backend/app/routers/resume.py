import json
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.analysis import Analysis
from app.schemas.resume import AnalyzeResponse, AnalysisOut, OptimizationSuggestion, SkillMatch
from app.services.auth import get_optional_user as get_current_user
from app.services.pdf_parser import extract_text_from_pdf
from app.services.match_scorer import compute_match
from app.services.ai_suggester import generate_suggestions, summarize_job_description

router = APIRouter(prefix="/resume", tags=["resume"])

MAX_PDF_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_resume(
    resume: UploadFile = File(..., description="PDF resume file"),
    job_description: str = Form(..., description="Job description text"),
    job_title: str = Form("", description="Job title (optional)"),
    company: str = Form("", description="Company name (optional)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if resume.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    file_bytes = await resume.read()
    if len(file_bytes) > MAX_PDF_SIZE:
        raise HTTPException(status_code=400, detail="PDF exceeds 5 MB limit")

    resume_text = extract_text_from_pdf(file_bytes)
    if not resume_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from PDF")

    score_data = compute_match(resume_text, job_description)

    suggestions_raw = await generate_suggestions(
        resume_text, job_description, score_data["missing_skills"]
    )

    job_summary = await summarize_job_description(job_description)

    # Persist to DB
    analysis = Analysis(
        user_id=current_user.id,
        resume_filename=resume.filename or "resume.pdf",
        job_description=job_description[:4000],
        job_title=job_title,
        company=company,
        match_score=score_data["match_score"],
        required_coverage=score_data["required_coverage"],
        preferred_coverage=score_data["preferred_coverage"],
        quantified_impact=score_data["quantified_impact"],
        extracted_skills=json.dumps(score_data["extracted_skills"]),
        missing_skills=json.dumps(score_data["missing_skills"]),
        suggestions=json.dumps(suggestions_raw),
        job_summary=job_summary,
    )
    db.add(analysis)
    await db.commit()

    return AnalyzeResponse(
        match_score=score_data["match_score"],
        required_coverage=score_data["required_coverage"],
        preferred_coverage=score_data["preferred_coverage"],
        quantified_impact=score_data["quantified_impact"],
        extracted_skills=score_data["extracted_skills"],
        required_skills=[SkillMatch(**s) for s in score_data["required_skills"]],
        missing_skills=score_data["missing_skills"],
        suggestions=[OptimizationSuggestion(**s) for s in suggestions_raw],
    )


@router.get("/history", response_model=list[AnalysisOut])
async def analysis_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Analysis)
        .where(Analysis.user_id == current_user.id)
        .order_by(Analysis.created_at.desc())
        .limit(20)
    )
    analyses = result.scalars().all()

    out = []
    for a in analyses:
        out.append(AnalysisOut(
            id=a.id,
            resume_filename=a.resume_filename,
            job_title=a.job_title,
            company=a.company,
            match_score=a.match_score,
            required_coverage=a.required_coverage,
            preferred_coverage=a.preferred_coverage,
            quantified_impact=a.quantified_impact,
            extracted_skills=json.loads(a.extracted_skills or "[]"),
            missing_skills=json.loads(a.missing_skills or "[]"),
            suggestions=[OptimizationSuggestion(**s) for s in json.loads(a.suggestions or "[]")],
            created_at=a.created_at,
        ))
    return out
