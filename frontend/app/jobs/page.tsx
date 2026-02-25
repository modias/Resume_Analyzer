"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { jobs, Job } from "@/lib/mock";
import { Search, ExternalLink, TrendingUp, Banknote, BarChart2 } from "lucide-react";

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
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Job | null>(null);

  const filtered = jobs.filter(
    (j) =>
      j.company.toLowerCase().includes(query.toLowerCase()) ||
      j.role.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Job Insights</h1>
        <p className="text-muted-foreground text-sm mt-1">Internship roles matched to your profile</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9 bg-muted/40 border-border focus:border-primary/50"
                  placeholder="Search internship roles..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Badge variant="secondary" className="whitespace-nowrap text-xs">
                {filtered.length} roles
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs font-medium">Company</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium">Role</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium">Match Score</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium">Demand</TableHead>
                  <TableHead className="text-muted-foreground text-xs font-medium">Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((job, i) => (
                  <motion.tr
                    key={job.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelected(job)}
                    className="border-border cursor-pointer hover:bg-accent/50 transition-colors group"
                  >
                    <TableCell className="font-semibold text-sm text-foreground">{job.company}</TableCell>
                    <TableCell className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{job.role}</TableCell>
                    <TableCell><MatchBadge score={job.matchScore} /></TableCell>
                    <TableCell><DemandBadge level={job.demandLevel} /></TableCell>
                    <TableCell className="text-sm">{job.applyPriority}</TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Job Detail Drawer */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="bg-card border-l border-border w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-lg font-bold text-foreground">{selected.role}</SheetTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">{selected.company}</p>
                  </div>
                  <MatchBadge score={selected.matchScore} />
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
                      <p className="text-lg font-bold text-foreground">{selected.marketFrequency}%</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border bg-muted/30">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Banknote className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-xs text-muted-foreground">Salary Est.</span>
                      </div>
                      <p className="text-lg font-bold text-foreground">{selected.salaryEstimate}</p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                    <BarChart2 className="w-3.5 h-3.5" />
                    Required Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selected.requiredSkills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs bg-muted text-foreground">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Demand Level</p>
                  <DemandBadge level={selected.demandLevel} />
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Apply Priority</p>
                  <p className="text-sm font-medium text-foreground">{selected.applyPriority}</p>
                </div>

                <Button className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                  <ExternalLink className="w-4 h-4" />
                  Apply Now
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
