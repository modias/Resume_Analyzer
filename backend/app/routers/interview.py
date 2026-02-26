import json
import re
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.config import get_settings
from app.database import get_db
from app.models.practice import PracticeSession, DIFFICULTY_SCORE
from app.services.auth import get_optional_user
from app.models.user import User

router = APIRouter(prefix="/interview", tags=["interview"])
settings = get_settings()

DIFFICULTY_PROMPTS = {
    "easy": "beginner-friendly, conceptual questions suitable for someone just learning the language",
    "medium": "intermediate-level questions covering common patterns, data structures, and standard library usage",
    "hard": "advanced questions involving system design, optimization, concurrency, and edge cases",
    "god": "expert-level, fiendishly difficult questions covering internals, compiler behavior, performance micro-optimization, and tricky gotchas that even senior engineers struggle with",
}

_SYSTEM_PROMPT = """
You are a senior software engineer and technical interviewer.
Generate exactly 5 interview coding/technical questions for the given programming language and difficulty level.

Return a JSON array of objects, each with:
  "question" - the interview question (clear, specific, technical)
  "hint"     - a one-sentence hint or what to focus on
  "category" - one of: Fundamentals, Data Structures, Algorithms, System Design, Debugging, Best Practices

Return ONLY the JSON array, no markdown, no extra text.
""".strip()


class QuestionRequest(BaseModel):
    language: str
    difficulty: str


class InterviewQuestion(BaseModel):
    question: str
    hint: str
    category: str


class SkillProgress(BaseModel):
    language: str
    difficulty: str
    score: float


@router.post("/questions", response_model=list[InterviewQuestion])
async def generate_questions(req: QuestionRequest):
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="Gemini API key not configured.")

    difficulty = req.difficulty.lower()
    if difficulty not in DIFFICULTY_PROMPTS:
        raise HTTPException(status_code=400, detail="difficulty must be easy, medium, hard, or god")

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")

        prompt = (
            f"{_SYSTEM_PROMPT}\n\n"
            f"Language: {req.language}\n"
            f"Difficulty: {difficulty} — {DIFFICULTY_PROMPTS[difficulty]}"
        )

        response = model.generate_content(prompt)
        content = response.text or "[]"
        content = re.sub(r"^```[a-z]*\n?", "", content.strip())
        content = re.sub(r"\n?```$", "", content.strip())
        questions = json.loads(content)
        return questions[:5]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")


@router.post("/save-session")
async def save_session(
    req: QuestionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_optional_user),
):
    difficulty = req.difficulty.lower()
    score = DIFFICULTY_SCORE.get(difficulty, 25.0)

    # Update existing session for same language or create new one
    result = await db.execute(
        select(PracticeSession)
        .where(PracticeSession.user_id == current_user.id)
        .where(PracticeSession.language == req.language.strip())
    )
    existing = result.scalar_one_or_none()

    if existing:
        # Keep the highest difficulty attempted
        if score > existing.score:
            existing.score = score
            existing.difficulty = difficulty
    else:
        db.add(PracticeSession(
            user_id=current_user.id,
            language=req.language.strip(),
            difficulty=difficulty,
            score=score,
        ))

    await db.commit()
    return {"status": "saved"}


@router.get("/progress", response_model=list[SkillProgress])
async def get_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_optional_user),
):
    result = await db.execute(
        select(PracticeSession)
        .where(PracticeSession.user_id == current_user.id)
        .order_by(PracticeSession.score.desc())
    )
    sessions = result.scalars().all()
    return [
        SkillProgress(language=s.language, difficulty=s.difficulty, score=s.score)
        for s in sessions
    ]
