"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  House,
  FileText,
  BriefcaseBusiness,
  CircleDot,
  Brain,
  Settings,
  Sparkle,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMe, type User } from "@/lib/api";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: House },
  { label: "Analyze Resume", href: "/analyze", icon: FileText },
  { label: "Job Insights", href: "/jobs", icon: BriefcaseBusiness },
  { label: "Application Strategy", href: "/strategy", icon: CircleDot },
  { label: "Improve Skills", href: "/improve-skills", icon: Brain },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getMe().then(setUser).catch(() => {});
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "??";
  const displayName = user?.name ?? "Loading…";
  const displayEmail = user?.email ?? "";

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] flex flex-col border-r border-border bg-background z-40 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-6 -left-24 h-28 w-72 rounded-[100%] border-t-[3px] border-violet-500/80 blur-[1.5px] rotate-[-28deg] shadow-[0_-8px_30px_-4px_hsl(var(--primary)/0.7)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -left-16 h-32 w-48 rounded-full bg-primary/30 blur-3xl"
      />

      {/* Logo */}
      <div className="relative flex items-center gap-2.5 px-5 h-16">
        <Sparkle className="w-6 h-6 text-primary fill-primary/30" />
        <p className="text-base font-semibold text-foreground tracking-tight">CareerCore</p>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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
                    ? "bg-accent text-foreground"
                    : "text-foreground/80 hover:text-foreground hover:bg-accent/60"
                )}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {item.label}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User card bottom */}
      <div className="relative px-4 py-3 border-t border-border">
        <div className="flex items-center gap-3 p-1.5" title={displayEmail}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {initials}
          </div>
          <p className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">{displayName}</p>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
      </div>
    </aside>
  );
}
