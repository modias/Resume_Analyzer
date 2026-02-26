"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { StatCard } from "@/components/cards/StatCard";
import { SkillBarChart } from "@/components/charts/SkillBarChart";
import {
  skillBreakdowns, type SkillBreakdown,
  internConversionOverall, internConversionByCompany, conversionFactors,
  mentors, type Mentor, linkedInConnected,
} from "@/lib/mock";
import { getDashboardStats, type DashboardStats } from "@/lib/api";
import { AlertTriangle, TrendingUp, BookOpen, Zap, Clock, BarChart2, Layers, ChevronRight, GraduationCap, Code2, Users, Award, ArrowUpRight, Linkedin, UserPlus, ExternalLink, School, Link2, FileSearch, Loader2 } from "lucide-react";
import Link from "next/link";

function CircularGauge({ value }: { value: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-48 h-48">
      <svg className="absolute inset-0 rotate-[-90deg]" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="hsl(217 33% 14%)" strokeWidth="12" />
        <motion.circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="hsl(252 87% 67%)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="flex flex-col items-center z-10">
        <span className="text-4xl font-bold text-foreground">{value}%</span>
        <span className="text-xs text-muted-foreground mt-1">Match Score</span>
      </div>
    </div>
  );
}

const resourceTypeIcon: Record<string, React.ReactNode> = {
  Course: <GraduationCap className="w-3.5 h-3.5 text-primary" />,
  Docs: <BookOpen className="w-3.5 h-3.5 text-blue-400" />,
  Project: <Code2 className="w-3.5 h-3.5 text-green-400" />,
  Book: <BookOpen className="w-3.5 h-3.5 text-yellow-400" />,
};

const resourceTypeBadge: Record<string, string> = {
  Course: "bg-primary/15 text-primary border-primary/20",
  Docs: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Project: "bg-green-500/15 text-green-400 border-green-500/20",
  Book: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
};

function SkillBreakdownPanel({ breakdown }: { breakdown: SkillBreakdown }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={breakdown.skill}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -12 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col gap-4 h-full"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-foreground">{breakdown.skill}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{breakdown.category}</p>
          </div>
          <Badge className="shrink-0 bg-red-500/15 text-red-400 border-red-500/20 text-xs">Missing</Badge>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-muted/40 border border-border p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <BarChart2 className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] text-muted-foreground font-medium">Demand</span>
            </div>
            <p className="text-lg font-bold text-foreground">{breakdown.marketDemand}%</p>
          </div>
          <div className="rounded-lg bg-muted/40 border border-border p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="w-3 h-3 text-primary" />
              <span className="text-[10px] text-muted-foreground font-medium">Score +</span>
            </div>
            <p className="text-lg font-bold text-primary">+{breakdown.scoreImpact}%</p>
          </div>
          <div className="rounded-lg bg-muted/40 border border-border p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-3 h-3 text-green-400" />
              <span className="text-[10px] text-muted-foreground font-medium">Learn</span>
            </div>
            <p className="text-lg font-bold text-foreground">{breakdown.estimatedHours}h</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed">{breakdown.description}</p>

        {/* Roles */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3 h-3" /> Roles That Require It
          </p>
          <div className="flex flex-wrap gap-1.5">
            {breakdown.roles.map((r) => (
              <Badge key={r} variant="secondary" className="text-[10px] bg-muted text-muted-foreground">
                {r}
              </Badge>
            ))}
          </div>
        </div>

        {/* Related skills */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3" /> Related Skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {breakdown.relatedSkills.map((s) => (
              <Badge key={s} variant="outline" className="text-[10px] border-border text-muted-foreground">
                {s}
              </Badge>
            ))}
          </div>
        </div>

        {/* Resources */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <BookOpen className="w-3 h-3" /> How to Learn
          </p>
          <div className="space-y-1.5">
            {breakdown.resources.map((res) => (
              <div key={res.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                {resourceTypeIcon[res.type]}
                <span className="flex-1 leading-tight">{res.label}</span>
                <Badge variant="outline" className={`text-[9px] shrink-0 border px-1.5 py-0 ${resourceTypeBadge[res.type]}`}>
                  {res.type}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function MentorCard({ mentor, following, onToggle }: { mentor: Mentor; following: boolean; onToggle: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors duration-150"
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${mentor.avatarColor} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
          {mentor.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{mentor.name}</p>
          <p className="text-xs text-muted-foreground truncate">{mentor.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-semibold" style={{ color: mentor.companyColor }}>
              {mentor.company}
            </span>
            <span className="text-[10px] text-muted-foreground">· {mentor.tenure}</span>
          </div>
        </div>
        <a
          href={`https://linkedin.com/in/${mentor.linkedinSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 w-7 h-7 rounded-lg bg-[#0A66C2]/15 hover:bg-[#0A66C2]/30 flex items-center justify-center transition-colors"
          title="View on LinkedIn"
        >
          <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
        </a>
      </div>

      {/* School + mutual */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><School className="w-3 h-3" />{mentor.school}</span>
        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{mentor.mutualConnections} mutual</span>
      </div>

      {/* Skill overlap */}
      <div className="flex flex-wrap gap-1">
        {mentor.skillOverlap.map((s) => (
          <Badge key={s} variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20 px-1.5 py-0">
            {s}
          </Badge>
        ))}
      </div>

      {/* Follow button */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium border transition-all duration-150 ${
          following
            ? "bg-primary/15 text-primary border-primary/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
            : "bg-muted/40 text-muted-foreground border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30"
        }`}
      >
        <UserPlus className="w-3 h-3" />
        {following ? "Following" : "Follow"}
      </button>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [selectedGap, setSelectedGap] = useState<string>("");
  const [isLinkedInConnected, setIsLinkedInConnected] = useState(linkedInConnected);
  const [followingSet, setFollowingSet] = useState<Set<number>>(
    () => new Set(mentors.filter((m) => m.isFollowing).map((m) => m.id))
  );

  useEffect(() => {
    getDashboardStats()
      .then((data) => {
        setStats(data);
        if (data.skill_gaps.length > 0) setSelectedGap(data.skill_gaps[0].skill);
      })
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));
  }, []);

  const skillGaps = stats?.skill_gaps ?? [];
  const activeBreakdown: SkillBreakdown | undefined = skillBreakdowns[selectedGap];

  const toggleFollow = (id: number) =>
    setFollowingSet((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const scoreLabel =
    !stats || stats.match_score === 0 ? null :
    stats.match_score >= 72 ? "Strong Alignment" :
    stats.match_score >= 50 ? "Moderate Alignment" : "Needs Improvement";

  const scoreBadgeClass =
    !stats || stats.match_score === 0 ? "" :
    stats.match_score >= 72 ? "bg-green-500/15 text-green-400 border-green-500/20" :
    stats.match_score >= 50 ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" :
    "bg-red-500/15 text-red-400 border-red-500/20";

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Your resume intelligence overview</p>
      </motion.div>

      {/* Loading */}
      {loadingStats && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {/* No analysis yet */}
      {!loadingStats && (!stats || stats.total_analyses === 0) && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-dashed border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <FileSearch className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">No analysis yet</p>
                <p className="text-sm text-muted-foreground mt-1">Analyze a resume to see your dashboard data here.</p>
              </div>
              <Link href="/analyze">
                <Badge className="cursor-pointer bg-primary/20 text-primary border-primary/30 hover:bg-primary/30 transition-colors px-4 py-1.5 text-xs">
                  Go to Analyze Resume →
                </Badge>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Dashboard content — only shown when data exists */}
      {!loadingStats && stats && stats.total_analyses > 0 && (<>

      {/* Hero Match Score Card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-border bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
            <CircularGauge value={stats.match_score} />
            <div className="flex-1 space-y-3">
              {scoreLabel && (
                <Badge variant="secondary" className={`text-xs ${scoreBadgeClass}`}>
                  {scoreLabel}
                </Badge>
              )}
              <h2 className="text-2xl font-bold text-foreground">
                Current Match Score: {stats.match_score}%
                {(stats.job_title || stats.company) && (
                  <span className="text-base font-normal text-muted-foreground ml-2">
                    — {[stats.job_title, stats.company].filter(Boolean).join(" at ")}
                  </span>
                )}
              </h2>
              {stats.job_summary && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {stats.job_summary}
                </p>
              )}
              {skillGaps.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {skillGaps.slice(0, 3).map((g) => (
                    <Badge key={g.skill} variant="outline" className="text-xs border-red-500/30 text-red-400">
                      Add {g.skill}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.stat_cards.map((s, i) => (
          <StatCard key={s.label} {...s} index={i} />
        ))}
      </div>

      {/* Skill Coverage Chart */}
      {stats.skill_coverage.length > 0 && (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Skill Coverage Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <SkillBarChart data={stats.skill_coverage} />
          </CardContent>
        </Card>
      </motion.div>
      )}

      {/* Skill Gaps + Breakdown side-by-side */}
      {skillGaps.length > 0 && (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

          {/* Left — Top Skill Gaps list */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                Top Skill Gaps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {skillGaps.map((gap, i) => {
                const isSelected = selectedGap === gap.skill;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedGap(gap.skill)}
                    className={`w-full text-left rounded-lg border px-4 py-3 transition-all duration-150 group ${
                      isSelected
                        ? "border-primary/40 bg-primary/10"
                        : "border-border bg-muted/20 hover:border-primary/20 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Badge className="text-xs bg-red-500/15 text-red-400 border-red-500/20 shrink-0">
                          Missing
                        </Badge>
                        <span className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {gap.skill}
                        </span>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                          isSelected ? "text-primary rotate-90" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-snug line-clamp-2">{gap.why}</p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Right — Breakdown panel */}
          <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeBreakdown ? (
                <SkillBreakdownPanel breakdown={activeBreakdown} />
              ) : (
                <p className="text-sm text-muted-foreground">Select a skill gap to see the breakdown.</p>
              )}
            </CardContent>
          </Card>

        </div>
      </motion.div>
      )}

      {/* LinkedIn Mentors */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                  People You Follow at Target Companies
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Mentors & professionals at companies on your list — their path could be yours.
                </p>
              </div>

              {/* LinkedIn connect / connected badge */}
              {isLinkedInConnected ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0A66C2]/15 border border-[#0A66C2]/30">
                  <div className="w-2 h-2 rounded-full bg-[#0A66C2] animate-pulse" />
                  <span className="text-xs font-medium text-[#0A66C2]">LinkedIn connected</span>
                  <button
                    onClick={() => setIsLinkedInConnected(false)}
                    className="text-[10px] text-muted-foreground hover:text-foreground ml-1 underline underline-offset-2"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsLinkedInConnected(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0A66C2] hover:bg-[#005885] text-white text-xs font-semibold transition-colors duration-150 shadow-sm"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Connect LinkedIn
                </button>
              )}
            </div>

            {/* Not-connected banner */}
            {!isLinkedInConnected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 flex items-start gap-3 p-3 rounded-lg bg-[#0A66C2]/8 border border-[#0A66C2]/20"
              >
                <Linkedin className="w-4 h-4 text-[#0A66C2] shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Connect your LinkedIn account to automatically sync people you follow, surface warm introductions,
                  and get notified when someone at a target company posts about internships.{" "}
                  <span className="text-foreground font-medium">Showing sample data below.</span>
                </p>
              </motion.div>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Stats strip */}
            <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <strong className="text-foreground">{mentors.length}</strong> people at target companies
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <strong className="text-foreground">{followingSet.size}</strong> following
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <strong className="text-foreground">{mentors.reduce((s, m) => s + m.mutualConnections, 0)}</strong> mutual connections total
              </span>
            </div>

            {/* Mentor grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {mentors.map((mentor) => (
                <MentorCard
                  key={mentor.id}
                  mentor={mentor}
                  following={followingSet.has(mentor.id)}
                  onToggle={() => toggleFollow(mentor.id)}
                />
              ))}
            </div>

            {/* Footer CTA */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                Reach out to a connection for a referral — it increases your conversion odds by{" "}
                <span className="text-primary font-semibold">+31%</span>.
              </p>
              <a
                href="https://linkedin.com/search/results/people/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-[#0A66C2] hover:underline font-medium"
              >
                Find more <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Intern → Part-Time Conversion */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Award className="w-4 h-4 text-green-400" />
                Intern → Part-Time Conversion
              </CardTitle>
              <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-xs">
                Industry data · 2024
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              What % of interns at top companies receive a part-time offer after their internship.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Big stat + caption */}
            <div className="flex items-center gap-6 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20">
              <div className="text-center shrink-0">
                <p className="text-5xl font-extrabold text-green-400">{internConversionOverall}%</p>
                <p className="text-xs text-muted-foreground mt-1">industry avg.</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">More than half of interns convert to part-time.</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Conversion rates vary significantly by company, team, and — most importantly — how well-prepared
                  the intern is going in. A higher match score before you start directly correlates with a better offer rate.
                </p>
              </div>
            </div>

            {/* Per-company bars */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Users className="w-3 h-3" /> By Company
              </p>
              <div className="space-y-2.5">
                {internConversionByCompany.map((row, i) => (
                  <motion.div
                    key={row.company}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.32 + i * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <span className="text-xs font-medium text-foreground w-14 shrink-0">{row.company}</span>
                    <div className="flex-1 relative h-5 bg-muted/40 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background:
                            row.rate >= 75
                              ? "linear-gradient(90deg,#22c55e,#16a34a)"
                              : row.rate >= 60
                              ? "linear-gradient(90deg,#6366f1,#8b5cf6)"
                              : "linear-gradient(90deg,#f59e0b,#d97706)",
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${row.rate}%` }}
                        transition={{ duration: 0.7, delay: 0.34 + i * 0.05, ease: "easeOut" }}
                      />
                      <span className="absolute inset-0 flex items-center pl-2.5 text-[10px] font-semibold text-white/90">
                        {row.rate}%
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground w-20 shrink-0 text-right">
                      ~{row.headcount.toLocaleString()} interns/yr
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Factors that improve conversion */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <ArrowUpRight className="w-3 h-3" /> Factors That Increase Your Conversion Odds
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {conversionFactors.map((f) => (
                  <div
                    key={f.label}
                    className="rounded-lg border border-border bg-muted/20 p-3 flex flex-col gap-1"
                  >
                    <span className="text-lg font-extrabold" style={{ color: f.color }}>{f.impact}</span>
                    <span className="text-[11px] text-muted-foreground leading-tight">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>

          </CardContent>
        </Card>
      </motion.div>

      </>)}
    </div>
  );
}
