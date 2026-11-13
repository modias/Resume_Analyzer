"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/cards/StatCard";
import { getDashboardStats, type DashboardStats } from "@/lib/api";
import { AlertTriangle, FileSearch, Loader2 } from "lucide-react";
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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));
  }, []);

  const skillGaps = stats?.skill_gaps ?? [];

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

      {/* Skill Gaps */}
      {skillGaps.length > 0 && (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              Top Skill Gaps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {skillGaps.map((gap) => (
              <div key={gap.skill} className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Badge className="text-xs bg-red-500/15 text-red-400 border-red-500/20 shrink-0">
                    Missing
                  </Badge>
                  <span className="text-sm font-medium text-foreground">{gap.skill}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{gap.why}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
      )}

      </>)}
    </div>
  );
}
