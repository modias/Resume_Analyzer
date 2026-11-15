"""
AI-generated learning roadmaps and lesson notes (Groq).

Roadmaps fall back to a generic four-step outline when GROQ_API_KEY is unset;
lesson notes require the key because there is no useful offline substitute.
"""

import asyncio
import json

from app.config import get_settings
from app.services.ai_suggester import _groq_chat

settings = get_settings()


class LearningAIUnavailable(RuntimeError):
    pass


_ROADMAP_PROMPT = """
You are a senior engineer and mentor who designs short, practical study plans
for students preparing for tech internships.

Return a JSON object with exactly these keys:
  "summary": one sentence describing what the learner will be able to do after the plan
  "lessons": an array of exactly 4 lessons, ordered from foundations to applied use.
     Each lesson has:
       "title":       short title, at most 6 words, without numbering
       "description": one sentence, at most 14 words, naming the concrete topics covered
       "duration":    realistic study time as a range, e.g. "2-3 hrs"

Keep lessons practical and interview-relevant. Do not include links.
""".strip()


_NOTES_PROMPT = """
You are an expert teacher writing study notes for a student preparing for tech
internship interviews. Write clear, accurate, beginner-friendly notes that
still go deep enough to be useful in an interview.

Return a JSON object with exactly these keys:
  "overview":  2-3 sentences on what this lesson covers and why it matters
  "sections":  3-5 objects, each with
       "heading": short section title
       "body":    1-3 short paragraphs of explanation separated by "\\n\\n".
                  Wrap code identifiers and commands in single backticks.
       "bullets": array of short key points (may be empty)
       "code":    {"language": "...", "snippet": "..."} with a small, correct, runnable
                  example when the topic benefits from code; otherwise both fields are ""
  "key_takeaways":   3-5 one-sentence takeaways
  "common_mistakes": 2-4 one-sentence mistakes beginners make
  "practice_task":   one hands-on exercise the learner can do in under an hour
  "quiz": exactly 3 multiple-choice questions, each with
       "question":     the question
       "options":      exactly 4 answer strings
       "answer_index": index (0-3) of the correct option
       "explanation":  one sentence explaining the correct answer

Be factually precise. Do not include links or markdown headings.
""".strip()


def _strict(name: str, properties: dict) -> dict:
    return {
        "name": name,
        "strict": True,
        "schema": {
            "type": "object",
            "properties": properties,
            "required": list(properties),
            "additionalProperties": False,
        },
    }


def _obj(properties: dict) -> dict:
    return {
        "type": "object",
        "properties": properties,
        "required": list(properties),
        "additionalProperties": False,
    }


_STR = {"type": "string"}
_STR_LIST = {"type": "array", "items": _STR}

_ROADMAP_SCHEMA = _strict(
    "learning_roadmap",
    {
        "summary": _STR,
        "lessons": {
            "type": "array",
            "items": _obj({"title": _STR, "description": _STR, "duration": _STR}),
        },
    },
)

_NOTES_SCHEMA = _strict(
    "lesson_notes",
    {
        "overview": _STR,
        "sections": {
            "type": "array",
            "items": _obj(
                {
                    "heading": _STR,
                    "body": _STR,
                    "bullets": _STR_LIST,
                    "code": _obj({"language": _STR, "snippet": _STR}),
                }
            ),
        },
        "key_takeaways": _STR_LIST,
        "common_mistakes": _STR_LIST,
        "practice_task": _STR,
        "quiz": {
            "type": "array",
            "items": _obj(
                {
                    "question": _STR,
                    "options": _STR_LIST,
                    "answer_index": {"type": "integer"},
                    "explanation": _STR,
                }
            ),
        },
    },
)


def _clean_notes(data: dict) -> dict:
    """Drop malformed parts so the frontend only ever sees the documented shape."""
    sections = []
    for s in data.get("sections") or []:
        if not isinstance(s, dict) or not s.get("heading") or not s.get("body"):
            continue
        code = s.get("code") if isinstance(s.get("code"), dict) else {}
        snippet = str(code.get("snippet", "")).strip()
        sections.append(
            {
                "heading": str(s["heading"]).strip(),
                "body": str(s["body"]).strip(),
                "bullets": [str(b).strip() for b in s.get("bullets") or [] if str(b).strip()],
                "code": {"language": str(code.get("language", "")).strip(), "snippet": snippet} if snippet else None,
            }
        )
    quiz = []
    for q in data.get("quiz") or []:
        if not isinstance(q, dict):
            continue
        options = [str(o) for o in q.get("options") or []]
        idx = q.get("answer_index")
        if q.get("question") and len(options) >= 2 and isinstance(idx, int) and 0 <= idx < len(options):
            quiz.append(
                {
                    "question": str(q["question"]),
                    "options": options,
                    "answer_index": idx,
                    "explanation": str(q.get("explanation", "")),
                }
            )
    if len(sections) < 2:
        raise ValueError("Notes had too few valid sections")
    return {
        "overview": str(data.get("overview", "")).strip(),
        "sections": sections,
        "key_takeaways": [str(t) for t in data.get("key_takeaways") or [] if str(t).strip()],
        "common_mistakes": [str(t) for t in data.get("common_mistakes") or [] if str(t).strip()],
        "practice_task": str(data.get("practice_task", "")).strip(),
        "quiz": quiz,
    }


def _parse_json(content: str) -> dict:
    data = json.loads(content)
    if not isinstance(data, dict):
        raise ValueError("Expected a JSON object")
    return data


def _fallback_roadmap(skill: str) -> dict:
    return {
        "summary": f"Build a working foundation in {skill} and apply it to a small project.",
        "lessons": [
            {"title": f"{skill} Fundamentals", "description": f"Core concepts, vocabulary, and why teams use {skill}.", "duration": "2-3 hrs"},
            {"title": "Hands-on Basics", "description": "Set up your environment and work through the essential workflows.", "duration": "3-4 hrs"},
            {"title": "Real-world Patterns", "description": "Common patterns, best practices, and pitfalls seen in production.", "duration": "3-4 hrs"},
            {"title": "Mini Project", "description": f"Apply {skill} end to end in a small portfolio project.", "duration": "4-6 hrs"},
        ],
    }


def _learner_context(level: str, goal: str) -> list[str]:
    lines = []
    if level:
        lines.append(f"Learner's current level: {level}")
    if goal:
        lines.append(f"Learner's goal (tailor the plan to this): {goal}")
    return lines


def generate_roadmap_sync(
    skill: str,
    target_role: str,
    known_skills: list[str],
    level: str = "",
    goal: str = "",
) -> dict:
    if not settings.groq_api_key:
        return _fallback_roadmap(skill)

    context = _learner_context(level, goal)
    if target_role:
        context.append(f"Target role: {target_role}")
    if known_skills:
        context.append(f"Skills the learner already has: {', '.join(known_skills[:25])}")
    user_prompt = f"Create a study plan for: {skill}\n" + "\n".join(context)

    try:
        data = _parse_json(
            _groq_chat(
                [
                    {"role": "system", "content": _ROADMAP_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.4,
                max_tokens=1200,
                json_schema=_ROADMAP_SCHEMA,
            )
        )
        lessons = [
            {
                "title": str(l.get("title", "")).strip()[:255],
                "description": str(l.get("description", "")).strip(),
                "duration": str(l.get("duration", "")).strip()[:40],
            }
            for l in data.get("lessons", [])
            if isinstance(l, dict) and l.get("title")
        ][:6]
        if len(lessons) < 2:
            return _fallback_roadmap(skill)
        return {"summary": str(data.get("summary", "")).strip(), "lessons": lessons}
    except Exception:
        return _fallback_roadmap(skill)


def generate_lesson_notes_sync(
    skill: str,
    lesson_title: str,
    lesson_description: str,
    lesson_number: int,
    roadmap_titles: list[str],
    target_role: str,
    level: str = "",
    goal: str = "",
) -> dict:
    if not settings.groq_api_key:
        raise LearningAIUnavailable(
            "AI lesson notes need GROQ_API_KEY to be set on the backend."
        )

    outline = "\n".join(f"{i + 1}. {t}" for i, t in enumerate(roadmap_titles))
    user_prompt = (
        f"Skill: {skill}\n"
        f"Lesson {lesson_number}: {lesson_title}\n"
        f"Lesson scope: {lesson_description}\n"
        f"Full roadmap (stay within this lesson's scope):\n{outline}\n"
        + (f"Learner's target role: {target_role}\n" if target_role else "")
        + "".join(f"{line}\n" for line in _learner_context(level, goal))
    )

    last_error: Exception | None = None
    for _ in range(2):
        try:
            data = _parse_json(
                _groq_chat(
                    [
                        {"role": "system", "content": _NOTES_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.35,
                    max_tokens=5000,
                    json_schema=_NOTES_SCHEMA,
                )
            )
            return _clean_notes(data)
        except Exception as exc:  # retry once on malformed output
            last_error = exc
    raise LearningAIUnavailable(f"Could not generate notes right now: {last_error}")


async def generate_roadmap(
    skill: str,
    target_role: str,
    known_skills: list[str],
    level: str = "",
    goal: str = "",
) -> dict:
    return await asyncio.to_thread(generate_roadmap_sync, skill, target_role, known_skills, level, goal)


async def generate_lesson_notes(
    skill: str,
    lesson_title: str,
    lesson_description: str,
    lesson_number: int,
    roadmap_titles: list[str],
    target_role: str,
    level: str = "",
    goal: str = "",
) -> dict:
    return await asyncio.to_thread(
        generate_lesson_notes_sync,
        skill,
        lesson_title,
        lesson_description,
        lesson_number,
        roadmap_titles,
        target_role,
        level,
        goal,
    )
