"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDashboardStats, type DashboardStats } from "@/lib/api";
import {
  logApplication,
  updateApplicationStatus,
  getApplications,
  getApplicationTimeline,
  type ApplicationRecord,
  type TimelinePoint,
} from "@/lib/api";
import {
  Lightbulb, TrendingUp, FileSearch, Loader2,
  PlusCircle, Building2, Briefcase,
} from "lucide-react";
import Link from "next/link";

const tooltipStyle = {
  contentStyle: {
    background: "hsl(222 47% 7%)",
    border: "1px solid hsl(217 33% 14%)",
    borderRadius: "8px",
    color: "hsl(210 40% 98%)",
  },
};

const STATUS_OPTIONS = [
  { value: "applied",  label: "Applied",  color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  { value: "callback", label: "Callback", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
  { value: "offer",    label: "Offer",    color: "bg-green-500/15 text-green-400 border-green-500/20" },
  { value: "rejected", label: "Rejected", color: "bg-red-500/15 text-red-400 border-red-500/20" },
];

function StatusBadge({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
  return (
    <Badge variant="outline" className={`text-xs ${opt.color}`}>
      {opt.label}
    </Badge>
  );
}

export default function StrategyPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [timelineData, setTimelineData] = useState<TimelinePoint[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);

  // Log form state
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [formStatus, setFormStatus] = useState("applied");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inline status update optimistic state
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));

    refreshApps();
  }, []);

  async function refreshApps() {
    setLoadingApps(true);
    try {
      const [apps, timeline] = await Promise.all([
        getApplications(),
        getApplicationTimeline(),
      ]);
      setApplications(apps);
      setTimelineData(timeline);
    } catch {
      // silently fail — user may not be logged in yet
    } finally {
      setLoadingApps(false);
    }
  }

  async function handleLogApplication(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !role.trim()) {
      setFormError("Company and role are required.");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const newApp = await logApplication(company.trim(), role.trim(), formStatus);
      // Optimistically prepend to list
      setApplications((prev) => [newApp, ...prev]);
      setCompany("");
      setRole("");
      setFormStatus("applied");
      // Refresh timeline separately
      getApplicationTimeline().then(setTimelineData).catch(() => {});
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to log application.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id: number, newStatus: string) {
    setUpdatingId(id);
    try {
      const updated = await updateApplicationStatus(id, newStatus);
      // Optimistically update the row
      setApplications((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
      // Refresh timeline so callbacks line updates
      getApplicationTimeline().then(setTimelineData).catch(() => {});
    } catch {
      // noop — status reverts visually on next render
    } finally {
      setUpdatingId(null);
    }
  }

  const matchScore = stats?.match_score ?? 0;
  const gap = Math.max(0, 72 - matchScore);
  const topGaps = stats?.skill_gaps?.slice(0, 3) ?? [];

  const totalCallbacks = applications.filter(
    (a) => a.status === "callback" || a.status === "offer"
  ).length;
  const callbackRate =
    applications.length > 0
      ? Math.round((totalCallbacks / applications.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Application Strategy</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your applications and callbacks — data-driven insights to maximize your offer rate
        </p>
      </motion.div>

      {/* Loading stats */}
      {loadingStats && (
        <div className="flex items-center justify-center py-10">
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

      {/* Strategy content */}
      {!loadingStats && stats && stats.total_analyses > 0 && (
        <>
          {/* Key Insight */}
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
                        {gap > 0 && (
                          <> — just <span className="text-foreground font-semibold">{gap}%</span> away.</>
                        )}
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
        </>
      )}

      {/* ── Log Application Form ───────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-primary" />
              Log an Application
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogApplication} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="flex-1 space-y-1 w-full">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Company
                </label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Google"
                  className="h-9 text-sm bg-muted/40 border-border"
                />
              </div>
              <div className="flex-1 space-y-1 w-full">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> Role
                </label>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Data Science Intern"
                  className="h-9 text-sm bg-muted/40 border-border"
                />
              </div>
              <div className="space-y-1 w-full sm:w-40">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger className="h-9 text-sm bg-muted/40 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="h-9 px-5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm shrink-0 gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PlusCircle className="w-3.5 h-3.5" />
                )}
                Log Application
              </Button>
            </form>
            {formError && (
              <p className="text-xs text-red-400 mt-2">{formError}</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Timeline Chart ─────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Applications vs Callbacks Over Time
              </CardTitle>
              {applications.length > 0 && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    <span className="font-semibold text-foreground">{applications.length}</span> applied
                  </span>
                  <span>
                    <span className="font-semibold text-green-400">{totalCallbacks}</span> callbacks
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      callbackRate >= 30
                        ? "bg-green-500/15 text-green-400 border-green-500/20"
                        : callbackRate >= 15
                        ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {callbackRate}% callback rate
                  </Badge>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {timelineData.length === 0 ? "Log your first application above to start tracking." : "Your real application data"}
            </p>
          </CardHeader>
          <CardContent>
            {loadingApps ? (
              <div className="flex items-center justify-center h-[260px]">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : timelineData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[260px] gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No data yet — log an application above to see your chart.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={timelineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
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
                    allowDecimals={false}
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
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Applications Table ─────────────────────────────────────────────── */}
      {applications.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                All Applications
                <Badge variant="secondary" className="ml-1 text-[10px] bg-muted text-muted-foreground">
                  {applications.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-6 py-3">
                        Company
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">
                        Role
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">
                        Date Applied
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3 pr-6">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app, i) => (
                      <tr
                        key={app.id}
                        className={`border-b border-border last:border-0 transition-colors ${
                          i % 2 === 0 ? "bg-muted/10" : ""
                        }`}
                      >
                        <td className="px-6 py-3 font-medium text-foreground">
                          {app.company}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {app.role}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(app.applied_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 pr-6">
                          <div className="flex items-center gap-2">
                            <Select
                              value={app.status}
                              onValueChange={(val) => handleStatusChange(app.id, val)}
                              disabled={updatingId === app.id}
                            >
                              <SelectTrigger className="h-7 w-32 text-xs bg-muted/40 border-border">
                                {updatingId === app.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((s) => (
                                  <SelectItem key={s.value} value={s.value} className="text-xs">
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <StatusBadge status={app.status} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
