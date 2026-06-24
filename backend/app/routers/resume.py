import asyncio
import json
import re
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.user import User
from app.models.analysis import Analysis
from app.schemas.resume import (
    AnalyzeResponse,
    AnalysisOut,
    OptimizationSuggestion,
    SkillMatch,
    StructuredResume,
    SuggestionsResponse,
)
from app.services.auth import get_optional_user as get_current_user
from app.services.pdf_parser import extract_text_from_pdf
from app.services.pdf_export import structured_resume_to_pdf_bytes
from app.services.match_scorer import compute_match
from app.services.ai_suggester import (
    generate_suggestions_sync,
    summarize_job_description_sync,
)
from app.services.skill_extractor import extract_skills

router = APIRouter(prefix="/resume", tags=["resume"])

MAX_PDF_SIZE = 5 * 1024 * 1024  # 5 MB


def _merge_user_skills(current_user: User, new_skills: list[str]) -> None:
    try:
        existing_skills = json.loads(current_user.skills or "[]")
        if not isinstance(existing_skills, list):
            existing_skills = []
    except Exception:
        existing_skills = []
    merged_skills: list[str] = []
    seen = set()
    for skill in [*existing_skills, *new_skills]:
        if not isinstance(skill, str):
            continue
        normalized = skill.strip()
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        merged_skills.append(normalized)
    current_user.skills = json.dumps(merged_skills[:80])


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

    resume_text = await asyncio.to_thread(extract_text_from_pdf, file_bytes)
    if not resume_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from PDF")

    score_data = compute_match(resume_text, job_description)
    _merge_user_skills(current_user, score_data["extracted_skills"])

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
        suggestions=json.dumps([]),
        job_summary="",
        resume_text=resume_text,
    )
    db.add(analysis)
    db.add(current_user)
    await db.commit()
    await db.refresh(analysis)

    return AnalyzeResponse(
        analysis_id=analysis.id,
        match_score=score_data["match_score"],
        required_coverage=score_data["required_coverage"],
        preferred_coverage=score_data["preferred_coverage"],
        quantified_impact=score_data["quantified_impact"],
        extracted_skills=score_data["extracted_skills"],
        required_skills=[SkillMatch(**s) for s in score_data["required_skills"]],
        missing_skills=score_data["missing_skills"],
        suggestions=[],
        resume_text=resume_text,
    )


@router.get("/suggestions", response_model=SuggestionsResponse)
async def get_suggestions(
    analysis_id: int = Query(..., description="Analysis ID from POST /resume/analyze"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
    analysis = result.scalar_one_or_none()
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if analysis.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this analysis")

    existing = json.loads(analysis.suggestions or "[]")
    if existing:
        return SuggestionsResponse(
            suggestions=[OptimizationSuggestion(**s) for s in existing]
        )

    missing_skills = json.loads(analysis.missing_skills or "[]")
    resume_text = analysis.resume_text or ""
    if not resume_text.strip():
        raise HTTPException(status_code=422, detail="Resume text not available for this analysis")

    suggestions_raw, job_summary = await asyncio.gather(
        asyncio.to_thread(
            generate_suggestions_sync,
            resume_text,
            analysis.job_description,
            missing_skills,
        ),
        asyncio.to_thread(summarize_job_description_sync, analysis.job_description),
    )

    analysis.suggestions = json.dumps(suggestions_raw)
    analysis.job_summary = job_summary
    await db.commit()

    return SuggestionsResponse(
        suggestions=[OptimizationSuggestion(**s) for s in suggestions_raw]
    )


def _sanitize_pdf_filename(filename: str) -> str:
    name = re.sub(r"[^\w.\-]", "_", (filename or "").strip()) or "optimized-resume.pdf"
    if not name.lower().endswith(".pdf"):
        name += ".pdf"
    return name[:200]


@router.post("/export-pdf")
async def export_resume_pdf(
    body: StructuredResume,
    current_user: User = Depends(get_current_user),
):
    if not body.name.strip() and not body.sections:
        raise HTTPException(status_code=400, detail="Structured resume is empty")
    try:
        pdf_bytes = structured_resume_to_pdf_bytes(body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    safe_name = _sanitize_pdf_filename("optimized-resume.pdf")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )


@router.post("/upload")
async def upload_resume_only(
    resume: UploadFile = File(..., description="PDF resume file"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload and parse a resume without running full JD analysis.
    This marks the user as having an uploaded resume for apply-gating flows.
    """
    if resume.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    file_bytes = await resume.read()
    if len(file_bytes) > MAX_PDF_SIZE:
        raise HTTPException(status_code=400, detail="PDF exceeds 5 MB limit")

    resume_text = await asyncio.to_thread(extract_text_from_pdf, file_bytes)
    if not resume_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from PDF")

    extracted = extract_skills(resume_text)
    _merge_user_skills(current_user, extracted)

    analysis = Analysis(
        user_id=current_user.id,
        resume_filename=resume.filename or "resume.pdf",
        job_description="Resume upload only",
        job_title="",
        company="",
        match_score=0.0,
        required_coverage=0.0,
        preferred_coverage=0.0,
        quantified_impact=0.0,
        extracted_skills=json.dumps(extracted),
        missing_skills=json.dumps([]),
        suggestions=json.dumps([]),
        job_summary="",
        resume_text=resume_text,
    )
    db.add(analysis)
    db.add(current_user)
    await db.commit()

    return {"uploaded": True, "filename": analysis.resume_filename, "skills_detected": len(extracted)}


@router.get("/has-uploaded")
async def has_uploaded(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns whether the user has at least one saved resume analysis."""
    result = await db.execute(
        select(func.count()).select_from(Analysis).where(Analysis.user_id == current_user.id)
    )
    count = result.scalar_one()
    return {"has_resume": count > 0, "count": count}


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
