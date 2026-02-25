import re
from app.data.skills import SKILLS, CANONICAL_NAMES


def extract_skills(text: str) -> list[str]:
    """
    Return canonical skill names found in the given text.
    Uses regex matching against each skill's alias list.
    """
    text_lower = text.lower()
    found: set[str] = set()

    for canonical, aliases in SKILLS.items():
        for alias in aliases:
            pattern = alias if alias.startswith("\\b") else rf"(?<!\w){re.escape(alias)}(?!\w)"
            try:
                if re.search(pattern, text_lower):
                    found.add(canonical)
                    break
            except re.error:
                if alias.lower() in text_lower:
                    found.add(canonical)
                    break

    return sorted(found)


def skills_to_vector(skills: list[str]) -> dict[str, int]:
    """Return a binary presence vector over the canonical skill list."""
    skill_set = set(skills)
    return {s: int(s in skill_set) for s in CANONICAL_NAMES}
