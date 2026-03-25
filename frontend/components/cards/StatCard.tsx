"use client";

import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getCoverageStatHint } from "@/lib/coverageStatHints";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  index: number;
}

export function StatCard({ label, value, color, index }: StatCardProps) {
  const hint = getCoverageStatHint(label);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Card className="border-border bg-card hover:border-primary/30 transition-colors duration-200">
        <CardContent className="p-5">
          <div className="flex items-center gap-1 mb-3">
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            {hint && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={hint}
                    className="inline-flex shrink-0 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" align="start">
                  {hint}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-bold text-foreground">{value}%</span>
          </div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-primary/20">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: `${value}%` }}
              transition={{ duration: 0.8, delay: index * 0.08 + 0.2, ease: "easeOut" }}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
