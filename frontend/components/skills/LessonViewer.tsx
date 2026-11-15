"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Copy,
  Dumbbell,
  Lightbulb,
  Loader2,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  formatApiError,
  getLearningLesson,
  setLessonCompleted,
  type LearningLesson,
  type LearningLessonDetail,
  type LearningPlan,
} from "@/lib/api";

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return (
            <code key={i} className="rounded bg-muted px-1.5 py-0.5 text-[0.85em] font-mono text-primary">
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

function RichBody({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const isList = lines.length > 0 && lines.every((l) => /^([*-]|\d+\.)\s+/.test(l));
        if (isList) {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {lines.map((l, j) => (
                <li key={j}>
                  <InlineText text={l.replace(/^([*-]|\d+\.)\s+/, "")} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            <InlineText text={lines.join(" ")} />
          </p>
        );
      })}
    </div>
  );
}

function CodeBlock({ language, snippet }: { language: string; snippet: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-background/80 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border text-[11px] text-muted-foreground">
        <span className="font-mono">{language || "code"}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(snippet).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="flex items-center gap-1 hover:text-foreground"
        >
          <Copy className="w-3 h-3" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-3 text-xs leading-relaxed overflow-x-auto font-mono text-foreground/90">
        <code>{snippet}</code>
      </pre>
    </div>
  );
}

function Quiz({ quiz }: { quiz: LearningLessonDetail["notes"]["quiz"] }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const answered = Object.keys(picked).length;
  const correct = quiz.filter((q, i) => picked[i] === q.answer_index).length;

  return (
    <div className="space-y-4">
      {quiz.map((q, qi) => {
        const choice = picked[qi];
        const done = choice !== undefined;
        return (
          <div key={qi} className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-sm font-medium text-foreground mb-3">
              {qi + 1}. <InlineText text={q.question} />
            </p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const isAnswer = oi === q.answer_index;
                const isChoice = oi === choice;
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={done}
                    onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      !done && "border-border hover:border-primary/50 hover:bg-primary/5",
                      done && isAnswer && "border-green-500/40 bg-green-500/10 text-green-300",
                      done && isChoice && !isAnswer && "border-red-500/40 bg-red-500/10 text-red-300",
                      done && !isAnswer && !isChoice && "border-border opacity-60"
                    )}
                  >
                    {done && isAnswer ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : done && isChoice ? (
                      <XCircle className="w-4 h-4 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 shrink-0 text-muted-foreground" />
                    )}
                    <InlineText text={opt} />
                  </button>
                );
              })}
            </div>
            {done && q.explanation && (
              <p className="text-xs text-muted-foreground mt-3">
                <InlineText text={q.explanation} />
              </p>
            )}
          </div>
        );
      })}
      {answered === quiz.length && quiz.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
          <p className="text-sm text-foreground">
            You got <span className="font-semibold">{correct} of {quiz.length}</span> right.
          </p>
          <Button size="sm" variant="ghost" onClick={() => setPicked({})} className="gap-1.5 h-7 text-xs">
            <RotateCcw className="w-3 h-3" /> Retry
          </Button>
        </div>
      )}
    </div>
  );
}

export function LessonViewer({
  skill,
  lessonId,
  lessons,
  onOpenLesson,
  onClose,
  onPlanUpdated,
}: {
  skill: string;
  lessonId: number | null;
  lessons: LearningLesson[];
  onOpenLesson: (id: number) => void;
  onClose: () => void;
  onPlanUpdated: (plan: LearningPlan) => void;
}) {
  const [lesson, setLesson] = useState<LearningLessonDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback((id: number) => {
    setLoading(true);
    setError(null);
    setLesson(null);
    getLearningLesson(id)
      .then(setLesson)
      .catch((err) => setError(formatApiError(err, "Could not load this lesson.")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (lessonId != null) load(lessonId);
  }, [lessonId, load]);

  const index = lessons.findIndex((l) => l.id === lessonId);
  const next = index >= 0 ? lessons[index + 1] : undefined;
  const completed = lessons[index]?.completed ?? lesson?.completed ?? false;

  const toggleComplete = async () => {
    if (lessonId == null) return;
    setSaving(true);
    try {
      onPlanUpdated(await setLessonCompleted(lessonId, !completed));
    } catch (err) {
      setError(formatApiError(err, "Could not update progress."));
    } finally {
      setSaving(false);
    }
  };

  const notes = lesson?.notes;

  return (
    <Sheet open={lessonId != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl bg-card border-border overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-6 pt-6 pb-4">
          <SheetHeader className="text-left space-y-1">
            <p className="text-xs text-primary font-medium">
              {skill} · Lesson {index + 1} of {lessons.length}
            </p>
            <SheetTitle className="text-xl pr-6">{lessons[index]?.title ?? lesson?.title}</SheetTitle>
            <SheetDescription>{lessons[index]?.description}</SheetDescription>
          </SheetHeader>
        </div>

        <div className="px-6 py-5 space-y-6 text-sm text-foreground/85 leading-relaxed">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p>Writing your lesson notes…</p>
              <p className="text-xs">This takes a few seconds the first time.</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 space-y-3">
              <p>{error}</p>
              {lessonId != null && (
                <Button size="sm" variant="outline" onClick={() => load(lessonId)} className="h-7 text-xs">
                  Try again
                </Button>
              )}
            </div>
          )}

          {notes && (
            <>
              {notes.overview && (
                <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 flex gap-3">
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p><InlineText text={notes.overview} /></p>
                </div>
              )}

              {notes.sections.map((s, i) => (
                <section key={i} className="space-y-3">
                  <h3 className="text-base font-semibold text-foreground">{s.heading}</h3>
                  <RichBody text={s.body} />
                  {s.bullets.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1">
                      {s.bullets.map((b, j) => (
                        <li key={j}><InlineText text={b} /></li>
                      ))}
                    </ul>
                  )}
                  {s.code && <CodeBlock language={s.code.language} snippet={s.code.snippet} />}
                </section>
              ))}

              {notes.key_takeaways.length > 0 && (
                <section className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                  <h3 className="flex items-center gap-2 font-semibold text-foreground mb-2">
                    <Lightbulb className="w-4 h-4 text-green-400" /> Key Takeaways
                  </h3>
                  <ul className="space-y-1.5">
                    {notes.key_takeaways.map((t, i) => (
                      <li key={i} className="flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                        <span><InlineText text={t} /></span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {notes.common_mistakes.length > 0 && (
                <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <h3 className="flex items-center gap-2 font-semibold text-foreground mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" /> Common Mistakes
                  </h3>
                  <ul className="space-y-1.5">
                    {notes.common_mistakes.map((t, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-amber-400">•</span>
                        <span><InlineText text={t} /></span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {notes.practice_task && (
                <section className="rounded-xl border border-border bg-muted/20 p-4">
                  <h3 className="flex items-center gap-2 font-semibold text-foreground mb-2">
                    <Dumbbell className="w-4 h-4 text-primary" /> Practice Task
                  </h3>
                  <RichBody text={notes.practice_task} />
                </section>
              )}

              {notes.quiz.length > 0 && (
                <section className="space-y-3">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    Check Your Understanding
                    <Badge variant="secondary" className="text-[10px] bg-muted">{notes.quiz.length} questions</Badge>
                  </h3>
                  <Quiz key={lessonId} quiz={notes.quiz} />
                </section>
              )}
            </>
          )}
        </div>

        {notes && (
          <div className="sticky bottom-0 bg-card/95 backdrop-blur border-t border-border px-6 py-4 flex items-center gap-2">
            <Button
              onClick={toggleComplete}
              disabled={saving}
              variant={completed ? "secondary" : "default"}
              className={cn(
                "gap-2",
                completed
                  ? "bg-green-500/15 text-green-400 hover:bg-green-500/20"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {completed ? "Completed" : "Mark as complete"}
            </Button>
            {next && (
              <Button variant="outline" onClick={() => onOpenLesson(next.id)} className="gap-2 ml-auto border-border">
                Next lesson <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
