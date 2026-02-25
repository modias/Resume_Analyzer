"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  index: number;
}

export function StatCard({ label, value, color, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Card className="border-border bg-card hover:border-primary/30 transition-colors duration-200">
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground mb-3 font-medium">{label}</p>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-bold text-foreground">{value}%</span>
          </div>
          <Progress value={value} className="h-1.5" style={{ "--progress-color": color } as React.CSSProperties} />
        </CardContent>
      </Card>
    </motion.div>
  );
}
