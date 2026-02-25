const ELEVENLABS_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ?? "";

// Rachel — natural, clear voice
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export async function speakText(text: string): Promise<void> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail?.message ?? "ElevenLabs TTS request failed");
  }

  const arrayBuffer = await response.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  await audio.play();
}

export function buildAnalysisSummary(result: {
  match_score: number;
  required_coverage: number;
  preferred_coverage: number;
  quantified_impact: number;
  extracted_skills: string[];
  required_skills: { skill: string; present: boolean }[];
  missing_skills: string[];
  suggestions: { original: string; suggested: string; reason?: string }[];
}): string {
  const score = result.match_score.toFixed(0);
  const level =
    result.match_score >= 72
      ? "strong"
      : result.match_score >= 50
      ? "moderate"
      : "low";

  const missing = result.required_skills
    .filter((s) => !s.present)
    .map((s) => s.skill);

  const topSuggestions = result.suggestions.slice(0, 2);

  let summary = `Your resume has a ${level} match score of ${score} percent. `;
  summary += `You cover ${result.required_coverage.toFixed(0)} percent of the required skills and ${result.preferred_coverage.toFixed(0)} percent of preferred skills. `;

  if (result.extracted_skills.length > 0) {
    const top = result.extracted_skills.slice(0, 5).join(", ");
    summary += `Key skills detected on your resume include: ${top}. `;
  }

  if (missing.length > 0) {
    summary += `You are missing ${missing.length} required skill${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. `;
  } else {
    summary += `Great news — you have all the required skills listed in the job description. `;
  }

  if (topSuggestions.length > 0) {
    summary += `Here are your top optimization suggestions. `;
    topSuggestions.forEach((s, i) => {
      summary += `Suggestion ${i + 1}: ${s.reason ?? "Consider rewriting this bullet"} `;
    });
  }

  summary += `Good luck with your application!`;
  return summary;
}
