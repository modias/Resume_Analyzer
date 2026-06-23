"""
Resume bullet optimization suggestions.

Primary:  Groq (if GROQ_API_KEY is set)
Fallback: Rule-based rewrites using weak-word detection
"""

import re
import json
from app.config import get_settings

settings = get_settings()

# ── Rule-based fallback ───────────────────────────────────────────────────────

_WEAK_PATTERNS = [
    (re.compile(r"\bworked on\b", re.I), "engineered"),
    (re.compile(r"\bwas involved in\b", re.I), "contributed to"),
    (re.compile(r"\bresponsible for\b", re.I), "owned"),
    (re.compile(r"\bhelped\b", re.I), "collaborated to"),
    (re.compile(r"\bassisted\b", re.I), "supported"),
    (re.compile(r"\bconnected\b", re.I), "integrated"),
    (re.compile(r"\bimplemented\b", re.I), "engineered"),
    (re.compile(r"\bbuilt\b", re.I), "engineered"),
    (re.compile(r"\bmade\b", re.I), "engineered"),
    (re.compile(r"\bwrote\b", re.I), "developed"),
    (re.compile(r"\bused\b", re.I), "leveraged"),
    (re.compile(r"\bdid\b", re.I), "executed"),
    (re.compile(r"\bran\b", re.I), "executed"),
]

_METRIC_PATTERN = re.compile(
    r"\d[\d,\.]*%?|\d+[\-–]\d+|\d+\+?|\d+\s*-\s*(?:minute|second|hour|day|week|month|year)",
    re.I,
)


def _extract_metrics(text: str) -> list[str]:
    return _METRIC_PATTERN.findall(text)


def _rule_based_suggestions(resume_text: str, _missing_skills: list[str]) -> list[dict]:
    bullets = [
        b.strip()
        for b in re.split(r"[\n•\-\*]", resume_text)
        if len(b.strip()) > 40
    ][:6]

    results = []
    for bullet in bullets:
        improved = bullet
        verb_upgraded = False
        original_verb = ""
        new_verb = ""

        for pattern, replacement in _WEAK_PATTERNS:
            match = pattern.search(improved)
            if match:
                original_verb = match.group(0)
                new_verb = replacement
                improved = pattern.sub(replacement, improved, count=1)
                verb_upgraded = True
                break

        if improved == bullet:
            continue

        metrics = _extract_metrics(bullet)
        reason_parts = []
        if verb_upgraded:
            reason_parts.append(
                f"Upgraded weak opener '{original_verb}' to '{new_verb}'."
            )
        if metrics:
            reason_parts.append(
                f"Preserved existing metrics ({', '.join(metrics)})."
            )
        else:
            reason_parts.append("Tightened phrasing without inventing new metrics.")

        results.append({
            "original": bullet,
            "suggested": improved.strip(),
            "reason": " ".join(reason_parts),
        })

        if len(results) >= 3:
            break

    return results


# ── Groq path ─────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """
You are an expert resume coach for tech internship applications.
Given the full resume text and a job description for context, return EXACTLY 3
resume bullet point improvements as a JSON array.

Each item must have:
  "original"  - the original bullet (copy verbatim from the resume)
  "suggested" - one ATS-friendly sentence, richer and more impactful
  "reason"    - one specific sentence naming what changed (verb upgrade,
                metrics preserved, outcome added from resume context)

Grounding (strict):
- Use ONLY skills, technologies, projects, and outcomes stated somewhere in the
  FULL RESUME TEXT. You may combine facts from the same role/project across the
  resume to enrich a bullet — but do NOT invent tools, skills, or experiences.
- If a skill is in the JD but not in the resume, do NOT add it to a bullet.
- Never fabricate numbers (%, scale, throughput, counts) that are not in the resume.

Rewrite quality:
- Structure each suggested bullet as:
  [Strong action verb] + [what you built/did] + [how/method] + [result/impact]
- Preserve every number, percentage, range, duration, and count from the
  original bullet (e.g. "55% weight", "10-minute caching", "3–15 questions").
  Do not drop or change them. Keep all named technologies and tools.
- Add impact: if a bullet has no clear outcome, infer a reasonable qualitative
  one from resume context — e.g. "for students and early-career professionals",
  "reducing manual effort", "across X features". Never invent numeric metrics.
- Length: each suggestion MUST be 50–60 words. Preserve ALL key details,
  metrics, and technologies; cut filler and redundant phrasing only.
- No double verbs: never open with two action verbs joined by "and"
  (e.g. "Developed and implemented"). Pick the stronger verb only.
- Reframe weak bullets: if a bullet is from a non-technical or tangential
  project (e.g. SolidWorks, volunteer work), reframe it to highlight
  transferable skills — precision, documentation, problem-solving — relevant
  to software/data roles. Keep facts grounded in the resume.
- Replace weak openers (Built, Connected, Implemented, Worked on, Helped with)
  with precise verbs: Engineered, Architected, Optimized, Designed, Automated,
  Integrated, Developed, Led.
- One sentence only when possible; two short sentences are OK if needed to stay
  within 50–60 words without losing detail. Plain text, ATS-friendly.

Reason field:
- Be specific: "Upgraded 'Built' to 'Engineered', preserved 55% metric, and
  added outcome from project context (automated grading)." Not generic praise.

Return ONLY the JSON array, no markdown, no other text.
""".strip()


async def summarize_job_description(jd_text: str) -> str:
    if not settings.groq_api_key:
        return jd_text[:300].strip() + ("…" if len(jd_text) > 300 else "")
    try:
        import httpx
        from groq import Groq
        with httpx.Client(trust_env=False) as http_client:
            client = Groq(api_key=settings.groq_api_key, http_client=http_client)
            prompt = (
                "Summarize the following job description in exactly 2-3 sentences. "
                "Focus on the role, key responsibilities, and top required skills. "
                "Be concise and professional. Return only the summary, no labels or extra text.\n\n"
                f"JOB DESCRIPTION:\n{jd_text[:3000]}"
            )
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=200,
            )
        return (response.choices[0].message.content or "").strip()
    except Exception:
        return jd_text[:300].strip() + ("…" if len(jd_text) > 300 else "")


async def generate_suggestions(
    resume_text: str,
    jd_text: str,
    missing_skills: list[str],
) -> list[dict]:
    if not settings.groq_api_key:
        return _rule_based_suggestions(resume_text, missing_skills)

    try:
        import httpx
        from groq import Groq
        with httpx.Client(trust_env=False) as http_client:
            client = Groq(api_key=settings.groq_api_key, http_client=http_client)

            prompt = (
                f"FULL RESUME TEXT:\n{resume_text}\n\n"
                "JOB DESCRIPTION (context only — do not add JD-only skills to bullets):\n"
                f"{jd_text[:3000]}\n\n"
                "Pick the 3 weakest or most underdeveloped bullets and rewrite them "
                "using facts from the full resume. Each suggestion must be 50–60 words — "
                "preserve all metrics and technologies, cut filler only."
            )

            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.25,
                max_tokens=1000,
            )
        content = response.choices[0].message.content or "[]"
        content = re.sub(r"^```[a-z]*\n?", "", content.strip())
        content = re.sub(r"\n?```$", "", content.strip())
        suggestions = json.loads(content)
        return suggestions[:3]

    except Exception:
        return _rule_based_suggestions(resume_text, missing_skills)
