"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { skillCoverageData } from "@/lib/mock";

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#7c3aed", "#4f46e5"];

export function SkillBarChart() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={skillCoverageData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 14%)" />
        <XAxis
          dataKey="skill"
          tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(222 47% 7%)",
            border: "1px solid hsl(217 33% 14%)",
            borderRadius: "8px",
            color: "hsl(210 40% 98%)",
          }}
          formatter={(value: number | undefined) => [`${value ?? 0}%`, "Coverage"]}
        />
        <Bar dataKey="coverage" radius={[6, 6, 0, 0]}>
          {skillCoverageData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
