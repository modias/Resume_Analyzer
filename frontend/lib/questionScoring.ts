/**
 * Per-question weighted average: sum(w_i * s_i) / sum(w_i)
 * Raw accuracy: sum(s_i) / n
 */

export type Difficulty = "easy" | "medium" | "hard" | "god";

export interface ScoredQuestion {
  score: number;
  difficulty: string;
}

export interface QuestionMetrics {
  raw_accuracy: number;
  weighted_score: number;
}

const DIFFICULTY_WEIGHTS: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  god: 4,
};

function normalizeScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(100, score));
}

/** Unknown difficulty → weight 1 (same as easy). */
function weightForDifficulty(difficulty: string): number {
  const key = difficulty.trim().toLowerCase() as Difficulty;
  return DIFFICULTY_WEIGHTS[key] ?? 1;
}

export function computeQuestionMetrics(questions: ScoredQuestion[]): QuestionMetrics {
  if (questions.length === 0) {
    return { raw_accuracy: 0, weighted_score: 0 };
  }

  const scores: number[] = [];
  const weights: number[] = [];

  for (const q of questions) {
    const s = normalizeScore(q.score);
    const w = weightForDifficulty(q.difficulty);
    scores.push(s);
    weights.push(w);
  }

  const n = scores.length;
  const sumScores = scores.reduce((a, b) => a + b, 0);
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  const weightedNumerator = scores.reduce((acc, s, i) => acc + weights[i] * s, 0);

  return {
    raw_accuracy: sumScores / n,
    weighted_score: sumWeights > 0 ? weightedNumerator / sumWeights : 0,
  };
}
