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

KNOWN_LANGUAGES: set[str] = {
    # General-purpose
    "python", "javascript", "typescript", "java", "c", "c++", "c#", "go", "rust",
    "swift", "kotlin", "ruby", "php", "scala", "r", "perl", "haskell", "erlang",
    "elixir", "clojure", "f#", "ocaml", "dart", "lua", "julia", "groovy", "nim",
    "crystal", "zig", "d", "v", "chapel", "ada", "fortran", "cobol", "pascal",
    "delphi", "objective-c", "matlab", "octave", "smalltalk", "prolog", "lisp",
    "common lisp", "scheme", "racket", "forth", "assembly", "asm",
    # Web / scripting
    "html", "css", "sql", "bash", "shell", "powershell", "batch",
    # Data / ML / scientific
    "sas", "stata", "spss", "mojo",
    # Mobile
    "flutter",
    # Query / config
    "graphql", "solidity", "vyper", "move",
    # JVM / .NET variants
    "groovy", "jruby", "jython",
    # Esoteric / niche but real
    "brainfuck", "befunge", "coq", "agda", "idris", "lean",
}

DIFFICULTY_PROMPTS = {
    "easy": "beginner-friendly, conceptual questions suitable for someone just learning the language",
    "medium": "intermediate-level questions covering common patterns, data structures, and standard library usage",
    "hard": "advanced questions involving system design, optimization, concurrency, and edge cases",
    "god": "expert-level, fiendishly difficult questions covering internals, compiler behavior, performance micro-optimization, and tricky gotchas that even senior engineers struggle with",
}

def _build_system_prompt(count: int) -> str:
    return f"""
You are a senior software engineer and technical interviewer.
Generate exactly {count} interview coding/technical questions for the given programming language and difficulty level.

Return a JSON array of objects, each with:
  "question" - the interview question (clear, specific, technical)
  "hint"     - a one-sentence hint or what to focus on
  "category" - one of: Fundamentals, Data Structures, Algorithms, System Design, Debugging, Best Practices

Return ONLY the JSON array, no markdown, no extra text.
""".strip()


class QuestionRequest(BaseModel):
    language: str
    difficulty: str
    count: int = 5


class InterviewQuestion(BaseModel):
    question: str
    hint: str
    category: str


class CheckAnswerRequest(BaseModel):
    question: str
    answer: str
    language: str
    hint: str = ""


class CheckAnswerResponse(BaseModel):
    correct: bool
    score: int
    feedback: str
    ideal_answer: str


class SkillProgress(BaseModel):
    language: str
    difficulty: str
    score: float


@router.post("/questions", response_model=list[InterviewQuestion])
async def generate_questions(req: QuestionRequest):
    if not settings.groq_api_key:
        raise HTTPException(status_code=503, detail="Groq API key not configured.")

    difficulty = req.difficulty.lower()
    if difficulty not in DIFFICULTY_PROMPTS:
        raise HTTPException(status_code=400, detail="difficulty must be easy, medium, hard, or god")

    if req.language.strip().lower() not in KNOWN_LANGUAGES:
        raise HTTPException(status_code=422, detail="Language not found")

    count = max(1, min(req.count, 15))

    try:
        from groq import Groq
        client = Groq(api_key=settings.groq_api_key)

        prompt = (
            f"Language: {req.language}\n"
            f"Difficulty: {difficulty} — {DIFFICULTY_PROMPTS[difficulty]}"
        )

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": _build_system_prompt(count)},
                {"role": "user", "content": prompt},
            ],
            temperature=0.5,
            max_tokens=300 * count,
        )
        content = response.choices[0].message.content or "[]"
        content = re.sub(r"^```[a-z]*\n?", "", content.strip())
        content = re.sub(r"\n?```$", "", content.strip())
        questions = json.loads(content)
        return questions[:count]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")


_CHECK_SYSTEM_PROMPT = """
You are a strict but fair technical interviewer evaluating a candidate's answer to an interview question.

Given the question, the candidate's answer, and an optional hint, evaluate the answer and return a JSON object with:
  "correct"      - boolean, true if the answer is mostly correct (score >= 60)
  "score"        - integer 0-100 rating the answer quality
  "feedback"     - 2-3 sentences of constructive feedback explaining what was right/wrong
  "ideal_answer" - a concise model answer (3-6 sentences max) the candidate can learn from

Be honest but encouraging. Return ONLY the JSON object, no markdown, no extra text.
""".strip()


@router.post("/check-answer", response_model=CheckAnswerResponse)
async def check_answer(req: CheckAnswerRequest):
    if not settings.groq_api_key:
        raise HTTPException(status_code=503, detail="Groq API key not configured.")

    if not req.answer.strip():
        raise HTTPException(status_code=400, detail="Answer cannot be empty.")

    try:
        from groq import Groq
        client = Groq(api_key=settings.groq_api_key)

        user_prompt = (
            f"Language: {req.language}\n"
            f"Question: {req.question}\n"
            f"Hint: {req.hint or 'N/A'}\n"
            f"Candidate's Answer: {req.answer.strip()}"
        )

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": _CHECK_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=600,
        )
        content = response.choices[0].message.content or "{}"
        content = re.sub(r"^```[a-z]*\n?", "", content.strip())
        content = re.sub(r"\n?```$", "", content.strip())
        result = json.loads(content)
        return CheckAnswerResponse(
            correct=bool(result.get("correct", False)),
            score=int(result.get("score", 0)),
            feedback=result.get("feedback", ""),
            ideal_answer=result.get("ideal_answer", ""),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to evaluate answer: {str(e)}")


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
