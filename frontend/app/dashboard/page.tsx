"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { StatCard } from "@/components/cards/StatCard";
import { SkillBarChart } from "@/components/charts/SkillBarChart";
import { matchScore, statCards, skillGaps } from "@/lib/mock";
import { AlertTriangle, TrendingUp } from "lucide-react";

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
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Your resume intelligence overview</p>
      </motion.div>

      {/* Hero Match Score Card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-border bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
            <CircularGauge value={matchScore} />
            <div className="flex-1 space-y-3">
              <Badge variant="secondary" className="bg-yellow-500/15 text-yellow-400 border-yellow-500/20 text-xs">
                Moderate Alignment
              </Badge>
              <h2 className="text-2xl font-bold text-foreground">Current Match Score: {matchScore}%</h2>
              <p className="text-muted-foreground">
                Improve <span className="text-foreground font-semibold">3 key areas</span> to reach the optimal application threshold of 72%.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {["Add AWS skills", "Quantify impact", "Improve Tableau"].map((tip) => (
                  <Badge key={tip} variant="outline" className="text-xs border-primary/30 text-primary">
                    {tip}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((s, i) => (
          <StatCard key={s.label} {...s} index={i} />
        ))}
      </div>

      {/* Skill Coverage Chart */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Skill Coverage Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <SkillBarChart />
          </CardContent>
        </Card>
      </motion.div>

      {/* Skill Gaps */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              Top Skill Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="space-y-2">
              {skillGaps.map((gap, i) => (
                <AccordionItem
                  key={i}
                  value={`gap-${i}`}
                  className="border border-border rounded-lg px-4 bg-muted/20 data-[state=open]:border-primary/30"
                >
                  <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive" className="text-xs bg-red-500/15 text-red-400 border-red-500/20">
                        Missing
                      </Badge>
                      {gap.skill}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-3">
                    {gap.why}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
