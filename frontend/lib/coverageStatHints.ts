/** Short tooltip copy for coverage stat cards (analyze + dashboard). */
const HINTS: Record<string, string> = {
  "Required Coverage": "Required skills from the job that appear on your resume.",
  "Required Skills Coverage": "Required skills from the job that appear on your resume.",
  "Preferred Coverage": "Preferred skills from the job that appear on your resume.",
  "Preferred Skills Coverage": "Preferred skills from the job that appear on your resume.",
  "Quantified Impact": "Bullets with numbers or metrics; score maxes out at five such bullets.",
};

export function getCoverageStatHint(label: string): string | undefined {
  return HINTS[label];
}
