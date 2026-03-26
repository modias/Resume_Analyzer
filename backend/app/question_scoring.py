"""Per-question weighted score helpers (difficulty weights × user scores)."""

from __future__ import annotations

from typing import TypedDict

DIFFICULTY_WEIGHTS: dict[str, int] = {
    "easy": 1,
    "medium": 2,
    "hard": 3,
    "god": 4,
}


class QuestionMetrics(TypedDict):
    raw_accuracy: float
    weighted_score: float


def _normalize_score(score: float) -> float:
    return max(0.0, min(100.0, float(score)))


def _weight_for_difficulty(difficulty: str) -> int:
    """Unknown or empty difficulty defaults to easy (weight 1)."""
    key = (difficulty or "").strip().lower()
    return DIFFICULTY_WEIGHTS.get(key, 1)


def compute_question_metrics(
    questions: list[tuple[float, str]] | list[dict[str, object]],
) -> QuestionMetrics:
    """
    weighted_score = sum(w_i * s_i) / sum(w_i)
    raw_accuracy = sum(s_i) / n
    """
    if not questions:
        return QuestionMetrics(raw_accuracy=0.0, weighted_score=0.0)

    scores: list[float] = []
    weights: list[int] = []

    for item in questions:
        if isinstance(item, dict):
            raw_s = item.get("score", 0)
            diff = str(item.get("difficulty", "") or "")
        else:
            raw_s, diff = item[0], item[1]

        s = _normalize_score(float(raw_s))
        w = _weight_for_difficulty(diff)
        scores.append(s)
        weights.append(w)

    n = len(scores)
    sum_s = sum(scores)
    sum_w = sum(weights)
    weighted_num = sum(w * s for w, s in zip(weights, scores))

    raw_accuracy = sum_s / n
    weighted_score = weighted_num / sum_w if sum_w > 0 else 0.0

    return QuestionMetrics(raw_accuracy=raw_accuracy, weighted_score=weighted_score)
