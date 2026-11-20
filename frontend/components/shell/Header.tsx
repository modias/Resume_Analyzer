"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMe, logout, type User as ApiUser } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

export const GLOBAL_SEARCH_EVENT = "careercore:search";

export function Header() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    getMe().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (pathname === "/jobs") {
      window.dispatchEvent(new CustomEvent(GLOBAL_SEARCH_EVENT, { detail: q }));
    } else {
      router.push(`/jobs?q=${encodeURIComponent(q)}`);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <header className="fixed top-0 left-[260px] right-0 h-16 z-30 flex items-center justify-between gap-6 px-6 bg-background/80 backdrop-blur-md">
      <div className="w-8" />

      <form onSubmit={handleSearch} className="relative w-full max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search jobs, skills, or companies..."
          className="w-full h-11 rounded-2xl border border-border bg-card/70 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        />
      </form>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Bell className="w-[18px] h-[18px]" />
        </Button>

        {/* Avatar + dropdown */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:opacity-90 transition-opacity"
          >
            {initials}
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-10 w-52 rounded-xl border border-border bg-card shadow-2xl overflow-hidden z-50"
              >
                {/* User info */}
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{user?.name ?? "—"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{user?.email ?? "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Profile link */}
                <a
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profile & Settings
                </a>

                {/* Log out */}
                <button
                  onClick={() => { setOpen(false); logout(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors border-t border-border"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
