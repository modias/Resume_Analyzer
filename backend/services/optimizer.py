"""
Resume optimization suggestion generator.

Uses OpenAI when OPENAI_API_KEY is set; falls back to rule-based extraction
that identifies weak bullet points and rewrites them with stronger language.
"""
import re
from schemas.analysis import OptimizationSuggestion

# ---------------------------------------------------------------------------
# Weak verb patterns
# ---------------------------------------------------------------------------

_WEAK_VERB_PATTERNS = [
    (re.compile(r"\b(worked on|worked with|worked in)\b", re.IGNORECASE), "engineered", "Engineered"),
    (re.compile(r"\b(helped|assisted|aided)\b", re.IGNORECASE), "collaborated in", "Collaborated in"),
    (re.compile(r"\b(did|did the|was doing)\b", re.IGNORECASE), "executed", "Executed"),
    (re.compile(r"\b(made|created|built)\b", re.IGNORECASE), "developed", "Developed"),
    (re.compile(r"\b(used|utilized|leveraged)\b", re.IGNORECASE), "implemented", "Implemented"),
    (re.compile(r"\b(was responsible for|responsible for)\b", re.IGNORECASE), "led", "Led"),
    (re.compile(r"\b(participated in|took part in)\b", re.IGNORECASE), "contributed to", "Contributed to"),
    (re.compile(r"\b(improved|enhanced|increased)\b", re.IGNORECASE), "optimized", "Optimized"),
]

_IMPACT_TEMPLATES = [
    "resulting in a {pct}% improvement in {metric}",
    "reducing {metric} by {pct}%",
    "improving {metric} by {pct}%",
    "achieving {pct}% accuracy",
    "processing {n}K+ records daily",
]

_METRICS = ["processing time", "latency", "throughput", "accuracy", "efficiency", "error rate"]


def _is_weak_bullet(line: str) -> bool:
    """Return True if the bullet uses weak language or lacks quantification."""
    has_weak_verb = any(p.search(line) for p, _, _ in _WEAK_VERB_PATTERNS)
    has_number = bool(re.search(r"\d+", line))
    return has_weak_verb or not has_number


def _strengthen_bullet(original: str, jd_skills: list[str]) -> str:
    """Apply rule-based improvements to a weak bullet point."""
    improved = original.strip().rstrip(".")

    # Replace weak verbs
    for pattern, replacement, cap_replacement in _WEAK_VERB_PATTERNS:
        if pattern.search(improved):
            improved = pattern.sub(replacement, improved, count=1)
            # Capitalize first letter
            if improved:
                improved = cap_replacement + improved[len(replacement):]
            break

    # Add a skill reference from JD if one fits naturally
    if jd_skills:
        skill = jd_skills[0]
        if skill.lower() not in improved.lower():
            if "using" not in improved.lower() and "with" not in improved.lower():
                improved = f"{improved} using {skill}"

    # Add quantified impact if there are no numbers
    if not re.search(r"\d+", improved):
        import hashlib
        h = int(hashlib.md5(original.encode()).hexdigest(), 16)
        pct = 20 + (h % 60)  # 20–79
        metric = _METRICS[h % len(_METRICS)]
        improved = f"{improved}, {_IMPACT_TEMPLATES[h % 3].format(pct=pct, metric=metric, n=pct * 10)}"

    return improved + "."


def _extract_bullets(text: str) -> list[str]:
    """Extract bullet point lines from resume text."""
    lines = text.splitlines()
    bullets: list[str] = []
    for line in lines:
        stripped = line.strip()
        # Match lines starting with bullet characters or dashes
        if re.match(r"^[-•·▪▸◦*]\s+.{20,}", stripped):
            bullets.append(stripped.lstrip("-•·▪▸◦* ").strip())
        # Also match lines that look like resume bullets (action verb + content)
        elif re.match(r"^[A-Z][a-z]+ed\s+.{15,}", stripped) or re.match(r"^[A-Z][a-z]+ed,\s+.{15,}", stripped):
            bullets.append(stripped)
    return bullets


async def _generate_with_openai(
    resume_text: str,
    jd_text: str,
    api_key: str,
    model: str,
) -> list[OptimizationSuggestion]:
    """Generate optimization suggestions via OpenAI API."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=api_key)

    prompt = (
        "You are an expert resume coach for tech internship applicants.\n\n"
        "RESUME TEXT:\n"
        f"{resume_text[:3000]}\n\n"
        "JOB DESCRIPTION:\n"
        f"{jd_text[:2000]}\n\n"
        "Task: Identify exactly 3 weak bullet points or sentences in the resume that could be "
        "improved to better match the job description. For each, provide:\n"
        "1. The original text (verbatim from the resume)\n"
        "2. An improved version that uses stronger action verbs, quantified impact, "
        "and includes relevant skills from the JD\n\n"
        "Respond ONLY as a JSON array with objects having keys: "
        '"original" and "suggested". No other text.'
    )

    response = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=800,
        response_format={"type": "json_object"},
    )

    import json
    raw = response.choices[0].message.content or "{}"
    data = json.loads(raw)

    # Handle both {"suggestions": [...]} and direct array
    if isinstance(data, list):
        items = data
    else:
        items = data.get("suggestions", data.get("items", []))

    return [
        OptimizationSuggestion(original=item["original"], suggested=item["suggested"])
        for item in items[:3]
        if "original" in item and "suggested" in item
    ]


def _generate_rule_based(
    resume_text: str,
    jd_skills: list[str],
    max_suggestions: int = 3,
) -> list[OptimizationSuggestion]:
    """Rule-based fallback: find weak bullets and improve them."""
    bullets = _extract_bullets(resume_text)
    weak = [b for b in bullets if _is_weak_bullet(b)]

    # If not enough bullets found, generate generic suggestions
    if len(weak) < max_suggestions:
        generic_originals = [
            "Worked on data analysis projects using Python.",
            "Created visualizations for the team.",
            "Helped with machine learning model.",
            "Was responsible for data pipeline maintenance.",
            "Used SQL to query databases.",
        ]
        # Add generics until we have enough
        for g in generic_originals:
            if len(weak) >= max_suggestions:
                break
            if g not in weak:
                weak.append(g)

    suggestions: list[OptimizationSuggestion] = []
    for bullet in weak[:max_suggestions]:
        improved = _strengthen_bullet(bullet, jd_skills)
        suggestions.append(OptimizationSuggestion(original=bullet, suggested=improved))

    return suggestions


async def generate_optimization_suggestions(
    resume_text: str,
    jd_text: str,
    jd_skills: list[str],
    api_key: str = "",
    model: str = "gpt-4o-mini",
) -> list[OptimizationSuggestion]:
    """
    Generate resume optimization suggestions.
    Uses OpenAI if an API key is provided, otherwise falls back to rule-based generation.
    """
    if api_key:
        try:
            return await _generate_with_openai(resume_text, jd_text, api_key, model)
        except Exception:
            # Fallback silently on any OpenAI error
            pass

    return _generate_rule_based(resume_text, jd_skills)
