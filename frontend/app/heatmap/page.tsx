"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { heatmapSkills, heatmapRoles, heatmapData } from "@/lib/mock";
import { BarChart3 } from "lucide-react";

function getColor(value: number): string {
  if (value >= 85) return "bg-primary text-primary-foreground";
  if (value >= 70) return "bg-indigo-500/80 text-white";
  if (value >= 55) return "bg-indigo-500/50 text-white";
  if (value >= 40) return "bg-indigo-500/30 text-indigo-300";
  if (value >= 25) return "bg-indigo-500/15 text-indigo-400";
  return "bg-muted/30 text-muted-foreground";
}

function getIntensityLabel(value: number): string {
  if (value >= 85) return "Critical";
  if (value >= 70) return "High";
  if (value >= 55) return "Medium";
  if (value >= 40) return "Moderate";
  if (value >= 25) return "Low";
  return "Rare";
}

export default function HeatmapPage() {
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedRange, setSelectedRange] = useState("6mo");

  const displayRoles = selectedRole === "All Roles" ? heatmapRoles : [selectedRole];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Skill Heatmap</h1>
        <p className="text-muted-foreground text-sm mt-1">Skill demand intensity across internship roles</p>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex flex-wrap gap-3 items-center">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Filters:</span>

            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-44 h-8 text-xs bg-muted/40 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="All Roles" className="text-xs">All Roles</SelectItem>
                {heatmapRoles.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-44 h-8 text-xs bg-muted/40 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all" className="text-xs">All Locations</SelectItem>
                <SelectItem value="sf" className="text-xs">San Francisco</SelectItem>
                <SelectItem value="nyc" className="text-xs">New York</SelectItem>
                <SelectItem value="seattle" className="text-xs">Seattle</SelectItem>
                <SelectItem value="remote" className="text-xs">Remote</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedRange} onValueChange={setSelectedRange}>
              <SelectTrigger className="w-36 h-8 text-xs bg-muted/40 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="1mo" className="text-xs">Last 1 Month</SelectItem>
                <SelectItem value="3mo" className="text-xs">Last 3 Months</SelectItem>
                <SelectItem value="6mo" className="text-xs">Last 6 Months</SelectItem>
                <SelectItem value="1yr" className="text-xs">Last 1 Year</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </motion.div>

      {/* Legend */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Intensity:</span>
          {[
            { label: "Critical (85+)", cls: "bg-primary text-primary-foreground" },
            { label: "High (70+)", cls: "bg-indigo-500/80 text-white" },
            { label: "Medium (55+)", cls: "bg-indigo-500/50 text-white" },
            { label: "Moderate (40+)", cls: "bg-indigo-500/30 text-indigo-300" },
            { label: "Low (25+)", cls: "bg-indigo-500/15 text-indigo-400" },
            { label: "Rare (<25)", cls: "bg-muted/30 text-muted-foreground" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${item.cls.split(" ")[0]}`} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Heatmap grid */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-border bg-card overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Demand Intensity Grid</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto pb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-xs text-muted-foreground font-medium pb-3 pr-4 whitespace-nowrap w-32">
                    Role / Skill
                  </th>
                  {heatmapSkills.map((skill) => (
                    <th key={skill} className="pb-3 px-1">
                      <div className="text-[10px] text-muted-foreground font-medium writing-vertical whitespace-nowrap -rotate-45 origin-bottom-left h-16 flex items-end">
                        {skill}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRoles.map((role, ri) => (
                  <motion.tr
                    key={role}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: ri * 0.06 }}
                    className="group"
                  >
                    <td className="pr-4 py-1.5 whitespace-nowrap">
                      <span className="text-xs font-medium text-foreground">{role}</span>
                    </td>
                    {heatmapSkills.map((skill) => {
                      const val = heatmapData[role]?.[skill] ?? 0;
                      return (
                        <td key={skill} className="px-0.5 py-1">
                          <div className="group/cell relative">
                            <div
                              className={`w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-semibold cursor-default transition-all duration-150 hover:scale-110 hover:z-10 relative ${getColor(val)}`}
                              title={`${role} → ${skill}: ${val}% (${getIntensityLabel(val)})`}
                            >
                              {val}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top skills summary */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {heatmapSkills.slice(0, 10).map((skill) => {
            const avg = Math.round(
              displayRoles.reduce((sum, role) => sum + (heatmapData[role]?.[skill] ?? 0), 0) / displayRoles.length
            );
            return (
              <Card key={skill} className="border-border bg-card hover:border-primary/30 transition-colors">
                <CardContent className="p-3">
                  <p className="text-xs font-medium text-foreground mb-2">{skill}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-foreground">{avg}%</span>
                    <Badge variant="outline" className={`text-[10px] border-0 ${getColor(avg)}`}>
                      {getIntensityLabel(avg)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
