from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from schemas.analysis import AnalysisResult
from services.analyzer import analyze_resume
from core.config import get_settings

router = APIRouter()

# In-memory store for the latest analysis result (shared across requests)
_latest_result: AnalysisResult | None = None


def get_latest_result() -> AnalysisResult | None:
    return _latest_result


@router.post("/analyze", response_model=AnalysisResult, status_code=status.HTTP_200_OK)
async def analyze_endpoint(
    resume: UploadFile = File(..., description="Resume PDF file"),
    job_description: str = Form(..., description="Job description text"),
) -> AnalysisResult:
    """
    Analyze a resume against a job description.

    - Extracts skills from the PDF
    - Extracts required skills from the job description
    - Computes a match score
    - Identifies skill gaps with detailed breakdowns
    - Generates optimization suggestions (AI-powered if OPENAI_API_KEY is set)
    """
    global _latest_result

    settings = get_settings()

    # Validate file type
    if resume.content_type not in ("application/pdf", "application/octet-stream"):
        if not (resume.filename or "").lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF files are supported.",
            )

    # Validate file size (default 5 MB)
    pdf_bytes = await resume.read()
    max_bytes = settings.max_pdf_size_mb * 1024 * 1024
    if len(pdf_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.max_pdf_size_mb} MB limit.",
        )

    if not job_description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description cannot be empty.",
        )

    result = await analyze_resume(pdf_bytes, job_description)
    _latest_result = result
    return result
