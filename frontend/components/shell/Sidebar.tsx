"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FileSearch,
  Briefcase,
  Target,
  Brain,
  Settings,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analyze Resume", href: "/analyze", icon: FileSearch },
  { label: "Job Insights", href: "/jobs", icon: Briefcase },
  { label: "App Strategy", href: "/strategy", icon: Target },
  { label: "Improve Skills", href: "/improve-skills", icon: Brain },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] flex flex-col border-r border-border bg-card z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-none">Internship</p>
          <p className="text-sm font-semibold text-primary leading-none">Intelligence</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest px-3 mb-3">
          Navigation
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer",
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} />
                {item.label}
                {item.href === "/analyze" && (
                  <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-0">
                    New
                  </Badge>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User card bottom */}
      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
            AM
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">Arjun Modi</p>
            <p className="text-[11px] text-muted-foreground truncate">arjun@example.com</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-2 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs text-muted-foreground">Callback Rate</span>
          </div>
          <span className="text-xs font-bold text-green-400">18%</span>
        </div>
      </div>
    </aside>
  );
}
