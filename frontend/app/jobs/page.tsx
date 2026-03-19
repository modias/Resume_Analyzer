"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ExternalLink, TrendingUp, Banknote, BarChart2, Star, Loader2, MapPin, Building2, Calendar, Lock, FileText, Wifi, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getJobs, getMe, hasUploadedResume, type Job, type EmploymentType, type DatePosted } from "@/lib/api";

function MatchBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? "bg-green-500/15 text-green-400 border-green-500/20"
      : score >= 60
      ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20"
      : "bg-red-500/15 text-red-400 border-red-500/20";
  return (
    <Badge variant="outline" className={`${color} text-xs font-semibold`}>
      {score}%
    </Badge>
  );
}

function DemandBadge({ level }: { level: string }) {
  const color =
    level === "High"
      ? "bg-purple-500/15 text-purple-400 border-purple-500/20"
      : level === "Medium"
      ? "bg-blue-500/15 text-blue-400 border-blue-500/20"
      : "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={`${color} text-xs`}>
      {level}
    </Badge>
  );
}

export default function JobsPage() {
  // Live search filters (sent to API)
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("INTERN");
  const [datePosted, setDatePosted] = useState<DatePosted>("week");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Job | null>(null);
  const [dreamCompanies, setDreamCompanies] = useState<string[]>([]);
  const [hasResume, setHasResume] = useState<boolean | null>(null);

  // Debounce ref for search/location inputs
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchJobs = useCallback((params: {
    search: string; location: string; employmentType: EmploymentType;
    datePosted: DatePosted; remoteOnly: boolean; page: number;
  }) => {
    setLoading(true);
    getJobs({
      search: params.search || undefined,
      location: params.location || undefined,
      employment_type: params.employmentType,
      date_posted: params.datePosted,
      remote_only: params.remoteOnly || undefined,
      page: params.page,
    })
      .then(setJobs)
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  // On mount
  useEffect(() => {
    fetchJobs({ search, location, employmentType, datePosted, remoteOnly, page });
    getMe().then((u) => setDreamCompanies(u.dream_companies ?? [])).catch(() => {});
    hasUploadedResume().then(setHasResume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced refetch when text inputs change
  const triggerSearch = (overrides: Partial<{
    search: string; location: string; employmentType: EmploymentType;
    datePosted: DatePosted; remoteOnly: boolean; page: number;
  }> = {}) => {
    const params = {
      search, location, employmentType, datePosted, remoteOnly, page: 1,
      ...overrides,
    };
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchJobs(params), 500);
  };

  const handleSearchChange = (v: string) => { setSearch(v); triggerSearch({ search: v, page: 1 }); };
  const handleLocationChange = (v: string) => { setLocation(v); triggerSearch({ location: v, page: 1 }); };

  const handleTypeChange = (v: EmploymentType) => {
    setEmploymentType(v); setPage(1);
    fetchJobs({ search, location, employmentType: v, datePosted, remoteOnly, page: 1 });
  };
  const handleDateChange = (v: DatePosted) => {
    setDatePosted(v); setPage(1);
    fetchJobs({ search, location, employmentType, datePosted: v, remoteOnly, page: 1 });
  };
  const handleRemoteToggle = () => {
    const next = !remoteOnly; setRemoteOnly(next); setPage(1);
    fetchJobs({ search, location, employmentType, datePosted, remoteOnly: next, page: 1 });
  };
  const handlePageChange = (next: number) => {
    setPage(next);
    fetchJobs({ search, location, employmentType, datePosted, remoteOnly, page: next });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isDream = (company: string) =>
    dreamCompanies.some((d) => d.toLowerCase() === company.toLowerCase());

  const sorted = [
    ...jobs.filter((j) => isDream(j.company)),
    ...jobs.filter((j) => !isDream(j.company)),
  ];

  const dreamCount = jobs.filter((j) => isDream(j.company)).length;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Job Insights</h1>
        <p className="text-muted-foreground text-sm mt-1">Internship roles matched to your profile</p>
      </motion.div>

      {hasResume === false && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-yellow-400" />
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground font-semibold">Resume required to apply.</span>{" "}
                  Upload your resume so we can verify you&apos;re a strong fit before you apply.
                </p>
              </div>
              <Link
                href="/analyze"
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-300 text-xs font-semibold hover:bg-yellow-500/30 transition-colors border border-yellow-500/30"
              >
                <FileText className="w-3.5 h-3.5" />
                Upload Resume
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {dreamCount > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-semibold">{dreamCount} dream compan{dreamCount !== 1 ? "ies" : "y"}</span> found — pinned to the top with a ⭐
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-border bg-card">
          <CardHeader className="pb-3 space-y-3">
            {/* Row 1: search + location */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9 bg-muted/40 border-border focus:border-primary/50"
                  placeholder="Search jobs (e.g. 'data scientist', 'frontend engineer')"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
              <div className="relative sm:w-48">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-9 bg-muted/40 border-border focus:border-primary/50"
                  placeholder="Location (optional)"
                  value={location}
                  onChange={(e) => handleLocationChange(e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={employmentType} onValueChange={(v) => handleTypeChange(v as EmploymentType)}>
                <SelectTrigger className="h-8 w-36 text-xs bg-muted/40 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERN">Internship</SelectItem>
                  <SelectItem value="FULLTIME">Full-time</SelectItem>
                  <SelectItem value="PARTTIME">Part-time</SelectItem>
                  <SelectItem value="CONTRACTOR">Contract</SelectItem>
                </SelectContent>
              </Select>

              <Select value={datePosted} onValueChange={(v) => handleDateChange(v as DatePosted)}>
                <SelectTrigger className="h-8 w-32 text-xs bg-muted/40 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="3days">Last 3 days</SelectItem>
                  <SelectItem value="week">This week</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>

              <button
                onClick={handleRemoteToggle}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium transition-colors ${
                  remoteOnly
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Wifi className="w-3.5 h-3.5" />
                Remote only
              </button>

              <Badge variant="secondary" className="whitespace-nowrap text-xs ml-auto">
                {loading ? "…" : `${sorted.length} roles`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                <Search className="w-8 h-8 opacity-30" />
                <p className="text-sm">No jobs found. Try different search terms or filters.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-xs font-medium w-8"></TableHead>
                    <TableHead className="text-muted-foreground text-xs font-medium">Company</TableHead>
                    <TableHead className="text-muted-foreground text-xs font-medium">Role</TableHead>
                    <TableHead className="text-muted-foreground text-xs font-medium">Match Score</TableHead>
                    <TableHead className="text-muted-foreground text-xs font-medium">Demand</TableHead>
                    <TableHead className="text-muted-foreground text-xs font-medium">Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((job, i) => (
                    <motion.tr
                      key={job.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => setSelected(job)}
                      className={`border-border cursor-pointer hover:bg-accent/50 transition-colors group ${
                        isDream(job.company) ? "bg-yellow-500/5" : ""
                      }`}
                    >
                      <TableCell className="pr-0">
                        {isDream(job.company) && (
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-sm text-foreground">{job.company}</TableCell>
                      <TableCell className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{job.role}</TableCell>
                      <TableCell><MatchBadge score={job.match_score} /></TableCell>
                      <TableCell><DemandBadge level={job.demand_level} /></TableCell>
                      <TableCell className="text-sm">{job.apply_priority}</TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {!loading && sorted.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">Page {page}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  disabled={sorted.length < 10}
                  onClick={() => handlePageChange(page + 1)}
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Job Detail Drawer */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="bg-card border-l border-border w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {selected.employer_logo ? (
                      <img
                        src={selected.employer_logo}
                        alt={selected.company}
                        className="w-10 h-10 rounded-lg object-contain border border-border bg-white p-1 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted/40 border border-border flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SheetTitle className="text-lg font-bold text-foreground leading-tight">{selected.role}</SheetTitle>
                        {isDream(selected.company) && (
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{selected.company}</p>
                      {isDream(selected.company) && (
                        <Badge className="mt-1.5 text-[10px] bg-yellow-500/15 text-yellow-400 border-yellow-500/20 border">
                          Dream Company
                        </Badge>
                      )}
                    </div>
                  </div>
                  <MatchBadge score={selected.match_score} />
                </div>
              </SheetHeader>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <Card className="border-border bg-muted/30">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-xs text-muted-foreground">Market Freq.</span>
                      </div>
                      <p className="text-lg font-bold text-foreground">{selected.market_frequency}%</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border bg-muted/30">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Banknote className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-xs text-muted-foreground">Salary Est.</span>
                      </div>
                      <p className="text-lg font-bold text-foreground">{selected.salary_estimate}</p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                    <BarChart2 className="w-3.5 h-3.5" />
                    Required Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selected.required_skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs bg-muted text-foreground">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Demand Level</p>
                  <DemandBadge level={selected.demand_level} />
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Apply Priority</p>
                  <p className="text-sm font-medium text-foreground">{selected.apply_priority}</p>
                </div>

                {selected.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {selected.location}
                  </div>
                )}

                {selected.posted_at && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    Posted {new Date(selected.posted_at).toLocaleDateString()}
                  </div>
                )}

                {hasResume === false ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <Lock className="w-4 h-4 text-yellow-400 shrink-0" />
                      <p className="text-xs text-yellow-300 leading-snug">
                        Upload your resume first to unlock applying. We&apos;ll make sure you&apos;re a strong fit before you apply.
                      </p>
                    </div>
                    <Link href="/analyze" className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors">
                      <FileText className="w-4 h-4" />
                      Upload Resume First
                    </Link>
                  </div>
                ) : selected.apply_link ? (
                  <a
                    href={selected.apply_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Apply Now
                  </a>
                ) : (
                  <Button className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                    <ExternalLink className="w-4 h-4" />
                    Apply Now
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
