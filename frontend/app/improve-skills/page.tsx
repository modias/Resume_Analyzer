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
  CheckCircle2,
  XCircle,
  SendHorizonal,
  Star,
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

interface AnswerResult {
  correct: boolean;
  score: number;
  feedback: string;
  ideal_answer: string;
}

export default function ImproveSkillsPage() {
  const [language, setLanguage] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(5);
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checking, setChecking] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<Record<number, AnswerResult>>({});

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
    setAnswers({});
    setResults({});

    try {
      const res = await fetch("http://localhost:8000/interview/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: language.trim(), difficulty, count: questionCount }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Request failed (${res.status})`);
      }

      const data: Question[] = await res.json();
      setQuestions(data);
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

  const handleCheckAnswer = async (i: number) => {
    const answer = answers[i] ?? "";
    if (!answer.trim()) return;

    setChecking((prev) => new Set(prev).add(i));
    try {
      const res = await fetch("http://localhost:8000/interview/check-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: questions[i].question,
          answer: answer.trim(),
          language: language.trim(),
          hint: questions[i].hint,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Request failed (${res.status})`);
      }

      const result: AnswerResult = await res.json();
      setResults((prev) => ({ ...prev, [i]: result }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [i]: {
          correct: false,
          score: 0,
          feedback: err instanceof Error ? err.message : "Failed to evaluate answer.",
          ideal_answer: "",
        },
      }));
    } finally {
      setChecking((prev) => {
        const next = new Set(prev);
        next.delete(i);
        return next;
      });
    }
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
          Generate interview questions, write your answer, and get instant AI feedback.
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

            {/* Question count */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Number of Questions
              </label>
              <div className="flex gap-2 flex-wrap">
                {[3, 5, 7, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setQuestionCount(n)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      questionCount === n
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

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
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-xs px-3">
                {language} · {selected.label} · {questions.length} {questions.length === 1 ? "Question" : "Questions"}
              </Badge>
              <div className="h-px flex-1 bg-border" />
            </div>

            {questions.map((q, i) => {
              const Icon = CATEGORY_ICONS[q.category] ?? Code2;
              const result = results[i];
              const isChecking = checking.has(i);

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <Card className="border-border bg-card">
                    <CardContent className="p-4 space-y-4">
                      {/* Question header */}
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

                      {/* Hint toggle */}
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

                      {/* Answer box */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Your Answer
                        </label>
                        <textarea
                          value={answers[i] ?? ""}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                          placeholder="Write your answer here…"
                          rows={4}
                          className="w-full resize-y rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors font-mono"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleCheckAnswer(i)}
                          disabled={isChecking || !(answers[i] ?? "").trim()}
                          className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          {isChecking ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                                className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                              />
                              Checking…
                            </>
                          ) : (
                            <>
                              <SendHorizonal className="w-3.5 h-3.5" />
                              Check Answer
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Result */}
                      <AnimatePresence>
                        {result && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-3"
                          >
                            {/* Score bar */}
                            <div className={`flex items-center gap-3 p-3 rounded-lg border ${result.correct ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                              {result.correct
                                ? <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                                : <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                              }
                              <div className="flex-1">
                                <p className={`text-sm font-semibold ${result.correct ? "text-green-400" : "text-red-400"}`}>
                                  {result.correct ? "Correct!" : "Not quite right"}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-yellow-400" />
                                <span className="text-sm font-bold text-yellow-400">{result.score}/100</span>
                              </div>
                            </div>

                            {/* Score progress bar */}
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${result.score}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className={`h-full rounded-full ${result.score >= 80 ? "bg-green-400" : result.score >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
                              />
                            </div>

                            {/* Feedback */}
                            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Feedback</p>
                              <p className="text-sm text-foreground leading-relaxed">{result.feedback}</p>
                            </div>

                            {/* Ideal answer */}
                            {result.ideal_answer && (
                              <div className="p-3 rounded-lg bg-primary/5 border border-primary/15 space-y-2">
                                <p className="text-xs font-medium text-primary uppercase tracking-wide">Model Answer</p>
                                <p className="text-sm text-muted-foreground leading-relaxed">{result.ideal_answer}</p>
                              </div>
                            )}
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
