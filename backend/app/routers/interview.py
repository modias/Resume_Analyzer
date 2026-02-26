import json
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import get_settings

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
    difficulty: str  # easy | medium | hard | god


class InterviewQuestion(BaseModel):
    question: str
    hint: str
    category: str


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
