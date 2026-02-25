"""
Resume bullet optimization suggestions.

Primary:  OpenAI GPT-4o (if OPENAI_API_KEY is set)
Fallback: Rule-based rewrites using weak-word detection
"""

import re
import json
from app.config import get_settings

settings = get_settings()

# ── Rule-based fallback ───────────────────────────────────────────────────────

_WEAK_PATTERNS = [
    (re.compile(r"\bworked on\b", re.I), "engineered"),
    (re.compile(r"\bhelped\b", re.I), "collaborated to"),
    (re.compile(r"\bassisted\b", re.I), "supported"),
    (re.compile(r"\bresponsible for\b", re.I), "owned"),
    (re.compile(r"\bwas involved in\b", re.I), "contributed to"),
    (re.compile(r"\bdid\b", re.I), "executed"),
    (re.compile(r"\bwrote\b", re.I), "developed"),
    (re.compile(r"\bmade\b", re.I), "built"),
    (re.compile(r"\bused\b", re.I), "leveraged"),
    (re.compile(r"\bran\b", re.I), "executed"),
]

_IMPACT_TEMPLATES = [
    "reducing processing time by X%",
    "improving model accuracy by X%",
    "supporting a team of X engineers",
    "handling X+ records per day",
]


def _rule_based_suggestions(resume_text: str, missing_skills: list[str]) -> list[dict]:
    bullets = [
        b.strip()
        for b in re.split(r"[\n•\-\*]", resume_text)
        if len(b.strip()) > 40
    ][:6]

    results = []
    for bullet in bullets:
        improved = bullet
        reason = ""

        for pattern, replacement in _WEAK_PATTERNS:
            if pattern.search(improved):
                improved = pattern.sub(replacement, improved, count=1)
                reason = f"Replaced weak verb with stronger action verb '{replacement}'."
                break

        # Nudge to add quantification if no numbers present
        if not re.search(r"\d", improved):
            improved += f", {_IMPACT_TEMPLATES[len(results) % len(_IMPACT_TEMPLATES)]}"
            reason = (reason or "") + " Added quantification placeholder to demonstrate impact."

        # Suggest missing skill injection if relevant
        if missing_skills and len(results) < 2:
            skill = missing_skills[len(results) % len(missing_skills)]
            improved += f" (using {skill})"
            reason = (reason or "") + f" Mentioned missing skill '{skill}' to improve JD alignment."

        if improved != bullet:
            results.append({
                "original": bullet,
                "suggested": improved.strip(),
                "reason": reason.strip(),
            })

        if len(results) >= 3:
            break

    return results


# ── OpenAI path ───────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """
You are an expert resume coach specializing in tech internship applications.
Given a resume text and a list of missing skills from the job description,
return EXACTLY 3 resume bullet point improvements as a JSON array.

Each item must have:
  "original"  - the original bullet (copy it verbatim from the resume)
  "suggested" - the improved version (stronger verbs, quantified, relevant skill mentioned)
  "reason"    - one sentence explaining the improvement

Rules:
- Use strong action verbs (Engineered, Built, Optimized, Automated, etc.)
- Add realistic quantification where missing (%, x-fold, throughput numbers)
- Naturally work in 1-2 of the missing skills where it makes sense
- Keep bullets under 20 words each
- Return ONLY the JSON array, no other text.
""".strip()


async def generate_suggestions(
    resume_text: str,
    jd_text: str,
    missing_skills: list[str],
) -> list[dict]:
    if not settings.openai_api_key:
        return _rule_based_suggestions(resume_text, missing_skills)

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.openai_api_key)

        user_msg = (
            f"RESUME (first 2000 chars):\n{resume_text[:2000]}\n\n"
            f"JOB DESCRIPTION (first 1000 chars):\n{jd_text[:1000]}\n\n"
            f"MISSING SKILLS: {', '.join(missing_skills[:8])}"
        )

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.7,
            max_tokens=800,
        )
        content = response.choices[0].message.content or "[]"
        # Strip markdown code fences if present
        content = re.sub(r"^```[a-z]*\n?", "", content.strip())
        content = re.sub(r"\n?```$", "", content.strip())
        suggestions = json.loads(content)
        return suggestions[:3]

    except Exception:
        return _rule_based_suggestions(resume_text, missing_skills)
