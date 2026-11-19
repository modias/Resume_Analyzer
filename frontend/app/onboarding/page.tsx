"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Sparkles, Check, Code2, Briefcase } from "lucide-react";
import { updateMe, formatApiError } from "@/lib/api";

const CODING_LANGUAGES = [
  "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go",
  "Rust", "Swift", "Kotlin", "Ruby", "PHP", "Scala", "R", "MATLAB",
  "SQL", "Bash", "Dart", "Elixir", "Haskell",
];

const DREAM_JOB_ROLES = [
  "Software Engineer", "Frontend Engineer", "Backend Engineer", "Full-Stack Engineer",
  "Data Scientist", "ML Engineer", "AI Researcher", "Data Engineer",
  "DevOps / SRE", "Cloud Engineer", "Security Engineer", "Mobile Engineer",
  "Product Manager", "UX Designer", "Quantitative Analyst", "Blockchain Engineer",
];

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
        selected
          ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
          : "bg-muted/40 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
      }`}
    >
      {selected && <Check className="w-3 h-3" />}
      {label}
    </button>
  );
}

function toggle(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
}

export default function OnboardingPage() {
  const router = useRouter();
  const [school, setSchool] = useState("");
  const [major, setMajor] = useState("");
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await updateMe({
        school,
        major,
        skills: selectedLangs,
        // Backend currently stores dream_job as a single string field.
        dream_job: selectedJobs.join(", "),
      });
      router.push("/dashboard");
    } catch (err) {
      setError(formatApiError(err, "Something went wrong."));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex w-10 h-10 rounded-xl bg-primary items-center justify-center mb-3">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set up your profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Personalize your CareerCore experience</p>
        </div>

        <Card className="border-border bg-card shadow-2xl">
          <CardContent className="pt-6 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">School <span className="opacity-50">(optional)</span></label>
                <Input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="UC Berkeley"
                  className="h-10 text-sm bg-muted/40 border-border focus:border-primary/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Major <span className="opacity-50">(optional)</span></label>
                <Input value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Computer Science"
                  className="h-10 text-sm bg-muted/40 border-border focus:border-primary/50" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-semibold text-foreground">Favorite coding languages</p>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                {CODING_LANGUAGES.map((lang) => (
                  <Chip key={lang} label={lang} selected={selectedLangs.includes(lang)}
                    onClick={() => setSelectedLangs((prev) => toggle(prev, lang))} />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-semibold text-foreground">Dream job roles</p>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                {DREAM_JOB_ROLES.map((role) => (
                  <Chip key={role} label={role} selected={selectedJobs.includes(role)}
                    onClick={() => setSelectedJobs((prev) => toggle(prev, role))} />
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            <Button type="button" size="lg" disabled={loading} onClick={handleSubmit}
              className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Sparkles className="w-4 h-4" />
              {loading ? "Saving…" : "Go to Dashboard"}
            </Button>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>You can always update these in your settings.</span>
              <button type="button" onClick={() => router.push("/dashboard")} className="hover:text-foreground">
                Skip
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
