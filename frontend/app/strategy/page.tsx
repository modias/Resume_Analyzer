"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { applicationTimelineData, matchScoreBuckets } from "@/lib/mock";
import { getDashboardStats, type DashboardStats } from "@/lib/api";
import { Lightbulb, TrendingUp, BarChart2, FileSearch, Loader2 } from "lucide-react";
import Link from "next/link";

const tooltipStyle = {
  contentStyle: {
    background: "hsl(222 47% 7%)",
    border: "1px solid hsl(217 33% 14%)",
    borderRadius: "8px",
    color: "hsl(210 40% 98%)",
  },
};

const BUCKET_COLORS = ["#374151", "#4b5563", "#6366f1", "#818cf8", "#a78bfa"];

export default function StrategyPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const matchScore = stats?.match_score ?? 0;
  const gap = Math.max(0, 72 - matchScore);
  const topGaps = stats?.skill_gaps?.slice(0, 3) ?? [];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Application Strategy</h1>
        <p className="text-muted-foreground text-sm mt-1">Data-driven insights to maximize your callback rate</p>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {/* No analysis yet */}
      {!loading && (!stats || stats.total_analyses === 0) && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-dashed border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <FileSearch className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Analyze your resume first</p>
                <p className="text-sm text-muted-foreground mt-1">
                  We need your resume analysis to generate personalized strategy insights.
                </p>
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

      {/* Strategy content — only shown when analysis data exists */}
      {!loading && stats && stats.total_analyses > 0 && (<>

      {/* Key Insight Callout */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-purple-500/10">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Key Insight</p>
              <p className="text-sm text-muted-foreground">
                {matchScore >= 72 ? (
                  <>
                    Your match score of{" "}
                    <span className="text-green-400 font-semibold">{matchScore}%</span>{" "}
                    already exceeds the{" "}
                    <span className="text-foreground font-semibold">72%</span> threshold — you have a{" "}
                    <span className="text-primary font-bold">+38%</span> higher callback probability than average.
                  </>
                ) : (
                  <>
                    If your match score exceeds{" "}
                    <span className="text-foreground font-semibold">72%</span>,{" "}
                    callback probability increases by{" "}
                    <span className="text-primary font-bold">38%</span>.{" "}
                    You are currently at{" "}
                    <span className="text-yellow-400 font-semibold">{matchScore}%</span>
                    {gap > 0 && <> — just <span className="text-foreground font-semibold">{gap}%</span> away.</>}
                  </>
                )}
              </p>
              {topGaps.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {topGaps.map((g) => (
                    <Badge key={g.skill} className="bg-primary/20 text-primary border-primary/30 text-xs">
                      +{g.skill}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Timeline Chart */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Applications vs Callbacks Over Time
            </CardTitle>
            <p className="text-xs text-muted-foreground">Industry benchmark data</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={applicationTimelineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 14%)" />
                <XAxis
                  dataKey="week"
                  tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "12px", color: "hsl(215 20% 55%)" }} />
                <Line
                  type="monotone"
                  dataKey="applications"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: "#6366f1", r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="callbacks"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Match Score Buckets Chart */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              Match Score Buckets vs Interview Rate
            </CardTitle>
            <p className="text-xs text-muted-foreground">Industry benchmark data</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={matchScoreBuckets} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 14%)" />
                <XAxis
                  dataKey="bucket"
                  tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number | undefined) => [`${v ?? 0}%`, "Interview Rate"]}
                />
                <Bar dataKey="interviewRate" radius={[6, 6, 0, 0]}>
                  {matchScoreBuckets.map((_, i) => (
                    <Cell key={i} fill={BUCKET_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      </>)}
    </div>
  );
}
