"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Check,
  GraduationCap,
  Layers,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  createLearningPlan,
  deleteLearningPlan,
  formatApiError,
  getLearningOverview,
  getLearningPlan,
  type LearningLevel,
  type LearningOverview,
  type LearningPlan,
} from "@/lib/api";
import { LessonViewer } from "@/components/skills/LessonViewer";
import { PracticeTool } from "@/components/skills/PracticeTool";

const panel = "rounded-2xl border border-border bg-card/60";

const LEVELS: { value: LearningLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const POPULAR_TOPICS = ["Python", "SQL", "Docker", "AWS", "System Design", "Git", "React", "Machine Learning"];

function ReadinessRing({ value }: { value: number | null }) {
  const size = 96;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value ?? 0));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="readiness-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#readiness-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct / 100) }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-foreground">
        {value == null ? "—" : `${Math.round(value)}%`}
      </span>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-400"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.6 }}
      />
    </div>
  );
}

export default function ImproveSkillsPage() {
  const [tab, setTab] = useState<"learn" | "practice">("learn");
  const [overview, setOverview] = useState<LearningOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [pendingSkill, setPendingSkill] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [openLessonId, setOpenLessonId] = useState<number | null>(null);

  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<LearningLevel>("");
  const [goal, setGoal] = useState("");
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const roadmapRef = useRef<HTMLDivElement>(null);

  const refreshOverview = useCallback(async () => {
    try {
      const data = await getLearningOverview();
      setOverview(data);
      setOverviewError(null);
      return data;
    } catch (err) {
      setOverviewError(formatApiError(err, "Could not load your skills."));
      return null;
    }
  }, []);

  const findPlan = (skill: string, plans = overview?.plans) =>
    plans?.find((p) => p.skill.toLowerCase() === skill.trim().toLowerCase()) ?? null;

  const showRoadmap = () =>
    setTimeout(() => roadmapRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);

  const openPlan = useCallback(
    async (skill: string, planId: number, needsRoadmap = false) => {
      setPlanError(null);
      setPendingSkill(skill);
      showRoadmap();
      try {
        setPlan(await getLearningPlan(planId));
        if (needsRoadmap) refreshOverview();
      } catch (err) {
        setPlanError(formatApiError(err, "Could not load this roadmap."));
      } finally {
        setPendingSkill(null);
      }
    },
    [refreshOverview]
  );

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("skill");
    refreshOverview().then((data) => {
      if (!data) return;
      const target = requested ? findPlan(requested, data.plans) : null;
      if (target) {
        openPlan(target.skill, target.id, target.total_lessons === 0);
        return;
      }
      if (requested) setTopic(requested);
      // Don't auto-generate a roadmap on page load; only open plans that already have one.
      const firstStarted = data.plans.find((p) => p.total_lessons > 0);
      if (firstStarted) getLearningPlan(firstStarted.id).then(setPlan).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshOverview, openPlan]);

  const createPlan = async (skill: string) => {
    setPlanError(null);
    setPendingSkill(skill);
    showRoadmap();
    try {
      setPlan(await createLearningPlan(skill, { level, goal: goal.trim() }));
      setTopic("");
      setGoal("");
      refreshOverview();
    } catch (err) {
      setPlanError(formatApiError(err, "Could not create a plan. Try again."));
    } finally {
      setPendingSkill(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const skill = topic.trim();
    if (!skill || pendingSkill) return;
    const existing = findPlan(skill);
    if (existing && existing.total_lessons > 0) {
      setFormNotice(`You already have a ${skill} plan, so it's open below. Delete it to make a new one.`);
      if (plan?.id === existing.id) showRoadmap();
      else openPlan(existing.skill, existing.id);
      return;
    }
    setFormNotice(null);
    createPlan(skill);
  };

  const handlePlanUpdated = (updated: LearningPlan) => {
    setPlan(updated);
    refreshOverview();
  };

  const handleDeletePlan = async () => {
    if (!plan || !window.confirm(`Delete your ${plan.skill} plan and its notes?`)) return;
    try {
      await deleteLearningPlan(plan.id);
      setPlan(null);
      const data = await refreshOverview();
      const nextId = data?.plans.find((p) => p.total_lessons > 0)?.id;
      if (nextId) setPlan(await getLearningPlan(nextId));
    } catch (err) {
      setPlanError(formatApiError(err, "Could not delete this plan."));
    }
  };

  const plans = overview?.plans ?? [];
  const recommendedChips = (overview?.recommended ?? []).filter((r) => !r.plan_id).slice(0, 8);
  const planKeys = new Set(plans.map((p) => p.skill.toLowerCase()));
  const popularChips = POPULAR_TOPICS.filter((t) => !planKeys.has(t.toLowerCase())).slice(0, 6);

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
      >
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Improve Skills</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tell us what you want to learn and get a personalized plan with AI-written lessons.
          </p>
        </div>
        <div className="flex shrink-0 rounded-xl border border-border bg-card/60 p-1">
          {(["learn", "practice"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                tab === t ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "learn" ? "Learn" : "Practice"}
            </button>
          ))}
        </div>
      </motion.div>

      {tab === "practice" ? (
        <PracticeTool />
      ) : (
        <>
          {overviewError && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-400">
              {overviewError}
            </div>
          )}

          {/* What do you want to learn? */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={cn(panel, "p-6 bg-gradient-to-br from-primary/10 via-card/60 to-card/60")}
          >
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="w-5 h-5 text-primary" />
              <p className="text-lg font-semibold text-foreground">What do you want to learn?</p>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Enter any skill or topic. The AI builds a step-by-step plan and writes notes for every lesson.
            </p>

            <div className="flex flex-col md:flex-row gap-2">
              <Input
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setFormNotice(null);
                }}
                placeholder="e.g. Docker, SQL window functions, system design, React hooks"
                maxLength={120}
                className="h-12 text-base bg-background/60 border-border focus-visible:ring-primary/40"
              />
              <Button
                type="submit"
                disabled={!topic.trim() || !!pendingSkill}
                className="h-12 px-6 gap-2 shrink-0 bg-gradient-to-r from-violet-600 to-purple-500 hover:opacity-90 text-white shadow-[0_0_30px_-8px_rgba(139,92,246,0.8)]"
              >
                {pendingSkill && pendingSkill === topic.trim() ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Create my plan
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[auto_minmax(0,1fr)] gap-3 mt-3">
              <div className="flex rounded-lg border border-border bg-background/40 p-0.5 self-start">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setLevel((cur) => (cur === l.value ? "" : l.value))}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                      level === l.value ? "bg-primary/25 text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <Input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Your goal (optional), e.g. pass a data engineering interview in 2 weeks"
                maxLength={300}
                className="h-9 text-sm bg-background/40 border-border"
              />
            </div>

            {formNotice && <p className="text-xs text-amber-400 mt-3">{formNotice}</p>}

            <div className="mt-5 space-y-2">
              {recommendedChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground mr-1">
                    Missing for {overview?.target_role || "your target job"}:
                  </span>
                  {recommendedChips.map((r) => (
                    <button
                      key={r.skill}
                      type="button"
                      onClick={() => setTopic(r.skill)}
                      className="flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-foreground hover:border-primary/50 transition-colors"
                    >
                      <span
                        className={cn("w-1.5 h-1.5 rounded-full", r.priority === "High" ? "bg-red-400" : "bg-amber-400")}
                      />
                      {r.skill}
                    </button>
                  ))}
                </div>
              )}
              {popularChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground mr-1">Popular:</span>
                  {popularChips.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTopic(t)}
                      className="rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
              {overview && !overview.has_analysis && (
                <p className="text-xs text-muted-foreground pt-1">
                  Tip: <Link href="/analyze" className="text-primary hover:underline">analyze your resume</Link>{" "}
                  against a job to see which skills you&apos;re missing.
                </p>
              )}
            </div>
          </motion.form>

          {overview?.has_analysis && overview.total > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className={cn(panel, "p-5 flex flex-col md:flex-row md:items-center gap-5")}
            >
              <ReadinessRing value={overview.readiness} />
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-foreground">Skill Readiness</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {overview.covered} of {overview.total} target skills covered
                  {overview.target_role && <> for {overview.target_role}</>}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-8 text-center">
                {[
                  { label: "Covered", value: overview.covered },
                  { label: "In Progress", value: overview.in_progress },
                  { label: "To Learn", value: overview.to_learn },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-2xl font-semibold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-4 items-start"
          >
            {/* Your plans */}
            <div className={cn(panel, "p-6")}>
              <div className="flex items-start gap-3 mb-4">
                <Layers className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-base font-semibold text-foreground">Your Learning Plans</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pick up where you left off.</p>
                </div>
              </div>
              {plans.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  {overview ? "No plans yet. Enter a topic above to create your first one." : "Loading…"}
                </p>
              ) : (
                <div className="space-y-1">
                  {plans.map((p) => {
                    const active = plan?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={!!pendingSkill}
                        onClick={() => (active ? showRoadmap() : openPlan(p.skill, p.id, p.total_lessons === 0))}
                        className={cn(
                          "w-full rounded-xl px-3 py-3 text-left transition-colors",
                          active ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-accent/50"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <span className="flex items-center gap-2 text-sm text-foreground truncate">
                            {p.skill}
                            {pendingSkill === p.skill && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                            {p.progress >= 100 && <Check className="w-3.5 h-3.5 text-green-400" />}
                          </span>
                          {p.total_lessons > 0 ? (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {p.completed_lessons}/{p.total_lessons} lessons
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                              {p.priority && (
                                <span
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    p.priority === "High" ? "bg-red-400" : "bg-amber-400"
                                  )}
                                />
                              )}
                              Not started
                            </span>
                          )}
                        </div>
                        {p.total_lessons > 0 ? (
                          <ProgressBar value={p.progress} />
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            {p.source === "analysis"
                              ? `Missing from your resume${p.priority ? ` · ${p.priority} priority` : ""}`
                              : "Click to build the roadmap"}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Roadmap */}
            <div ref={roadmapRef} className={cn(panel, "p-6 scroll-mt-24")}>
              <div className="flex items-start gap-3 mb-5">
                <BookOpen className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-foreground">
                    Learning Roadmap{plan && !pendingSkill && <span className="text-primary">: {plan.skill}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(!pendingSkill && plan?.summary) || "A focused, step-by-step plan for your topic."}
                  </p>
                  {plan && !pendingSkill && (plan.level || plan.goal) && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {plan.level && (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground capitalize">
                          {plan.level}
                        </span>
                      )}
                      {plan.goal && (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          Goal: {plan.goal}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {plan && !pendingSkill && (
                  <button
                    type="button"
                    onClick={handleDeletePlan}
                    aria-label="Delete plan"
                    className="text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {planError && <p className="text-sm text-red-400 mb-3">{planError}</p>}

              {pendingSkill && (!plan || plan.skill.toLowerCase() !== pendingSkill.toLowerCase()) ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-sm text-foreground">Building your {pendingSkill} plan…</p>
                  <p className="text-xs text-muted-foreground">The AI is planning your lessons.</p>
                </div>
              ) : plan ? (
                <>
                  <ol className="relative">
                    {plan.lessons.map((l, i) => {
                      const last = i === plan.lessons.length - 1;
                      return (
                        <li key={l.id} className="relative pl-10 pb-5 last:pb-0">
                          {!last && (
                            <span
                              className={cn(
                                "absolute left-[11px] top-7 bottom-0 w-0.5",
                                l.completed ? "bg-primary/60" : "bg-border"
                              )}
                            />
                          )}
                          <span
                            className={cn(
                              "absolute left-0 top-0.5 w-6 h-6 rounded-full flex items-center justify-center",
                              l.completed
                                ? "bg-primary text-white shadow-[0_0_12px_hsl(var(--primary)/0.6)]"
                                : "border-2 border-muted-foreground/40 bg-card"
                            )}
                          >
                            {l.completed && <Check className="w-3.5 h-3.5" />}
                          </span>
                          <button
                            type="button"
                            onClick={() => setOpenLessonId(l.id)}
                            className="w-full flex items-start justify-between gap-3 text-left group"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                {i + 1}. {l.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">{l.description}</p>
                            </div>
                            {l.duration && (
                              <span className="shrink-0 rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                {l.duration}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                  {(() => {
                    const nextLesson = plan.lessons.find((l) => !l.completed);
                    return (
                      <Button
                        onClick={() => setOpenLessonId((nextLesson ?? plan.lessons[0]).id)}
                        className="mt-6 w-full gap-2 bg-gradient-to-r from-violet-600 to-purple-500 hover:opacity-90 text-white"
                      >
                        <Sparkles className="w-4 h-4" />
                        {nextLesson
                          ? plan.lessons.some((l) => l.completed)
                            ? `Continue: ${nextLesson.title}`
                            : "Start learning"
                          : "Review lessons"}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    );
                  })()}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-14 gap-2 text-center">
                  <BookOpen className="w-8 h-8 text-muted-foreground/60" />
                  <p className="text-sm text-foreground">Your plan will appear here</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    {plans.length > 0
                      ? "Pick a plan from Your Learning Plans, or type a new topic above."
                      : <>Type what you want to learn above and click &quot;Create my plan&quot;.</>}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}

      <LessonViewer
        skill={plan?.skill ?? ""}
        lessonId={openLessonId}
        lessons={plan?.lessons ?? []}
        onOpenLesson={setOpenLessonId}
        onClose={() => setOpenLessonId(null)}
        onPlanUpdated={handlePlanUpdated}
      />
    </div>
  );
}
