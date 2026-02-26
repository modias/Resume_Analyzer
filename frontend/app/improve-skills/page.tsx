"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Brain,
  Sparkles,
  ChevronDown,
  Lightbulb,
  AlertCircle,
  Code2,
  Layers,
  Cpu,
  Bug,
  BookOpen,
  Wrench,
} from "lucide-react";
import { saveSkillSession } from "@/lib/api";

const DIFFICULTIES = [
  { value: "easy", label: "Easy", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  { value: "medium", label: "Medium", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  { value: "hard", label: "Hard", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  { value: "god", label: "God Level", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Fundamentals: BookOpen,
  "Data Structures": Layers,
  Algorithms: Cpu,
  "System Design": Wrench,
  Debugging: Bug,
  "Best Practices": Code2,
};

interface Question {
  question: string;
  hint: string;
  category: string;
}

export default function ImproveSkillsPage() {
  const [language, setLanguage] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const selected = DIFFICULTIES.find((d) => d.value === difficulty)!;

  const handleGenerate = async () => {
    if (!language.trim()) {
      setError("Please enter a programming language.");
      return;
    }
    setError(null);
    setLoading(true);
    setQuestions([]);
    setRevealed(new Set());

    try {
      const res = await fetch("http://localhost:8000/interview/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: language.trim(), difficulty }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Request failed (${res.status})`);
      }

      const data: Question[] = await res.json();
      setQuestions(data);
      // Save practice session to track skill progress on dashboard
      saveSkillSession(language.trim(), difficulty).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate questions.");
    } finally {
      setLoading(false);
    }
  };

  const toggleHint = (i: number) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" />
          Improve Skills
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Enter a programming language and difficulty — GPT generates 5 tailored interview questions for you to practice.
        </p>
      </motion.div>

      {/* Input card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Generate Interview Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Language input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Programming Language
              </label>
              <Input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                placeholder="e.g. Python, JavaScript, Rust, Go…"
                className="bg-muted/40 border-border focus:border-primary/50"
              />
            </div>

            {/* Difficulty dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Difficulty Level
              </label>
              <div className="relative">
                <button
                  onClick={() => setOpen((v) => !v)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${selected.bg} ${selected.color}`}
                >
                  <span>{selected.label}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden"
                    >
                      {DIFFICULTIES.map((d) => (
                        <button
                          key={d.value}
                          onClick={() => { setDifficulty(d.value); setOpen(false); }}
                          className={`w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent ${d.color} ${difficulty === d.value ? "bg-accent" : ""}`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                  />
                  Generating questions…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Questions
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Questions */}
      <AnimatePresence>
        {questions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-xs px-3">
                {language} · {selected.label} · {questions.length} Questions
              </Badge>
              <div className="h-px flex-1 bg-border" />
            </div>

            {questions.map((q, i) => {
              const Icon = CATEGORY_ICONS[q.category] ?? Code2;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <Card className="border-border bg-card">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${selected.bg} ${selected.color}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground flex items-center gap-1">
                              <Icon className="w-3 h-3" />
                              {q.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed">{q.question}</p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleHint(i)}
                        className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10 h-7"
                      >
                        <Lightbulb className="w-3 h-3" />
                        {revealed.has(i) ? "Hide Hint" : "Show Hint"}
                      </Button>

                      <AnimatePresence>
                        {revealed.has(i) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/15">
                              <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <p className="text-xs text-muted-foreground leading-relaxed">{q.hint}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
