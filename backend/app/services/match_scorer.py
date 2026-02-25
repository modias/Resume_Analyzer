"""
Match scoring engine.

Algorithm:
  1. Extract skills from resume text and job description text.
  2. Split JD skills into "required" (≥ 2 mentions or strong signal words)
     and "preferred" (everything else).
  3. Score:
     - required_coverage  = |resume ∩ required_jd| / |required_jd|
     - preferred_coverage = |resume ∩ preferred_jd| / max(|preferred_jd|, 1)
     - quantified_impact  = min(quantified_bullets / 5, 1.0)
  4. Final match score = weighted average:
       0.55 * required + 0.25 * preferred + 0.20 * quantified
"""

import re
from app.services.skill_extractor import extract_skills
from app.services.pdf_parser import count_quantified_bullets
from app.data.skills import CANONICAL_NAMES

# Words that signal a skill is explicitly required vs preferred
_REQUIRED_SIGNALS = re.compile(
    r"\b(required|must have|must-have|minimum|essential|proficiency in|experience with)\b",
    re.IGNORECASE,
)
_PREFERRED_SIGNALS = re.compile(
    r"\b(preferred|nice to have|plus|bonus|familiarity with|exposure to|ideally)\b",
    re.IGNORECASE,
)

WEIGHTS = {
    "required": 0.55,
    "preferred": 0.25,
    "quantified": 0.20,
}


def _split_required_preferred(jd_text: str, jd_skills: list[str]) -> tuple[list[str], list[str]]:
    """
    Heuristic: a skill is "required" if it appears in a sentence containing
    required-signal words, OR if it appears 2+ times in the JD.
    Everything else is "preferred".
    """
    jd_lower = jd_text.lower()
    required, preferred = [], []

    skill_count = {s: len(re.findall(re.escape(s.lower()), jd_lower)) for s in jd_skills}
    required_section = bool(_REQUIRED_SIGNALS.search(jd_text))
    preferred_section = bool(_PREFERRED_SIGNALS.search(jd_text))

    for skill in jd_skills:
        count = skill_count.get(skill, 0)
        skill_lower = skill.lower()

        # Find sentences containing this skill
        sentences = [s for s in re.split(r"[.\n]", jd_text) if skill_lower in s.lower()]
        in_required_sentence = any(_REQUIRED_SIGNALS.search(s) for s in sentences)
        in_preferred_sentence = any(_PREFERRED_SIGNALS.search(s) for s in sentences)

        if in_preferred_sentence and not in_required_sentence:
            preferred.append(skill)
        elif count >= 2 or in_required_sentence or (required_section and not preferred_section):
            required.append(skill)
        else:
            preferred.append(skill)

    # Ensure we always have at least some required skills
    if not required and jd_skills:
        split = max(1, int(len(jd_skills) * 0.6))
        required = jd_skills[:split]
        preferred = jd_skills[split:]

    return required, preferred


def compute_match(
    resume_text: str,
    jd_text: str,
) -> dict:
    resume_skills = extract_skills(resume_text)
    jd_skills = extract_skills(jd_text)

    required_skills, preferred_skills = _split_required_preferred(jd_text, jd_skills)

    resume_set = set(resume_skills)
    required_set = set(required_skills)
    preferred_set = set(preferred_skills)

    # Coverage scores (0.0 – 1.0)
    required_coverage = (
        len(resume_set & required_set) / len(required_set) if required_set else 0.0
    )
    preferred_coverage = (
        len(resume_set & preferred_set) / len(preferred_set) if preferred_set else 0.0
    )

    # Quantified impact score
    q_bullets = count_quantified_bullets(resume_text)
    quantified_impact = min(q_bullets / 5.0, 1.0)

    # Weighted final score, scaled to 0–100
    raw = (
        WEIGHTS["required"] * required_coverage
        + WEIGHTS["preferred"] * preferred_coverage
        + WEIGHTS["quantified"] * quantified_impact
    )
    match_score = round(raw * 100, 1)

    # Required vs missing skill list
    required_skill_matches = [
        {"skill": s, "present": s in resume_set} for s in required_skills
    ]
    missing_skills = [s for s in required_skills if s not in resume_set]

    return {
        "match_score": match_score,
        "required_coverage": round(required_coverage * 100, 1),
        "preferred_coverage": round(preferred_coverage * 100, 1),
        "quantified_impact": round(quantified_impact * 100, 1),
        "extracted_skills": resume_skills,
        "jd_skills": jd_skills,
        "required_skills": required_skill_matches,
        "missing_skills": missing_skills,
    }
