"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMe } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Connection {
  id: number;
  initials: string;
  name: string;
  title: string;
  company: string;
  tenure: string;
  school: string;
  mutual: number;
  skills: string[];
  following: boolean;
  linkedinUrl: string;
}

// ─── Sample data pool ─────────────────────────────────────────────────────────

const SAMPLE_POOL: Connection[] = [
  { id: 1, initials: "PS", name: "Priya Sharma", title: "Senior Data Sci...", company: "Google", tenure: "3 yrs", school: "UC Berkeley", mutual: 12, skills: ["Python", "SQL", "ML"], following: true, linkedinUrl: "#" },
  { id: 2, initials: "MC", name: "Marcus Chen", title: "ML Engineer", company: "Meta", tenure: "2 yrs", school: "Stanford", mutual: 8, skills: ["PyTorch", "Python", "Docker"], following: true, linkedinUrl: "#" },
  { id: 3, initials: "AP", name: "Aisha Patel", title: "Data Analyst", company: "Stripe", tenure: "1.5 yrs", school: "UC Berkeley", mutual: 5, skills: ["SQL", "Tableau", "A/B Testing"], following: false, linkedinUrl: "#" },
  { id: 4, initials: "JO", name: "James Okon...", title: "Data Engineer", company: "Amazon", tenure: "4 yrs", school: "Carnegie Mellon", mutual: 3, skills: ["Spark", "AWS", "Airflow"], following: true, linkedinUrl: "#" },
  { id: 5, initials: "SR", name: "Sofia Reyes", title: "Research Scien...", company: "Netflix", tenure: "8 mo", school: "MIT", mutual: 2, skills: ["R", "Statistics", "Python"], following: false, linkedinUrl: "#" },
  { id: 6, initials: "DK", name: "David Kim", title: "Analytics Engi...", company: "Airbnb", tenure: "2.5 yrs", school: "Georgia Tech", mutual: 6, skills: ["dbt", "SQL", "Python"], following: true, linkedinUrl: "#" },
  { id: 7, initials: "LN", name: "Lily Nguyen", title: "SWE Intern", company: "Microsoft", tenure: "6 mo", school: "UT Austin", mutual: 4, skills: ["TypeScript", "React", "Azure"], following: false, linkedinUrl: "#" },
  { id: 8, initials: "RB", name: "Ryan Brooks", title: "Backend Engineer", company: "Uber", tenure: "1 yr", school: "Cornell", mutual: 7, skills: ["Go", "Kafka", "PostgreSQL"], following: true, linkedinUrl: "#" },
  { id: 9, initials: "TW", name: "Tanya Wu", title: "Product Analyst", company: "Figma", tenure: "2 yrs", school: "Columbia", mutual: 9, skills: ["Python", "SQL", "Mixpanel"], following: false, linkedinUrl: "#" },
  { id: 10, initials: "AM", name: "Alex Mercer", title: "AI Researcher", company: "OpenAI", tenure: "1.5 yrs", school: "MIT", mutual: 11, skills: ["PyTorch", "CUDA", "Python"], following: true, linkedinUrl: "#" },
];

// Company badge colors
const COMPANY_COLORS: Record<string, string> = {
  Google: "text-blue-400",
  Meta: "text-blue-400",
  Stripe: "text-violet-400",
  Amazon: "text-orange-400",
  Netflix: "text-red-500",
  Airbnb: "text-rose-400",
  Microsoft: "text-sky-400",
  Uber: "text-green-400",
  Figma: "text-pink-400",
  OpenAI: "text-emerald-400",
  Apple: "text-gray-300",
  Nvidia: "text-green-400",
  Salesforce: "text-blue-500",
  LinkedIn: "text-sky-500",
};

function companyColor(company: string): string {
  for (const [key, cls] of Object.entries(COMPANY_COLORS)) {
    if (company.toLowerCase().includes(key.toLowerCase())) return cls;
  }
  return "text-primary";
}

// ─── Person Card ──────────────────────────────────────────────────────────────

function PersonCard({ person, index }: { person: Connection; index: number }) {
  const [following, setFollowing] = useState(person.following);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Card className="border-border bg-card hover:bg-accent/30 transition-colors">
        <CardContent className="p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-muted/60 border border-border flex items-center justify-center text-sm font-bold text-foreground shrink-0">
                {person.initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{person.name}</p>
                <p className="text-xs text-muted-foreground truncate">{person.title}</p>
                <p className={`text-xs font-medium ${companyColor(person.company)}`}>
                  {person.company} <span className="text-muted-foreground font-normal">· {person.tenure}</span>
                </p>
              </div>
            </div>
            {/* LinkedIn icon */}
            <a
              href={person.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 w-7 h-7 rounded-md bg-[#0A66C2]/20 hover:bg-[#0A66C2]/40 flex items-center justify-center transition-colors"
              title="View on LinkedIn"
            >
              <svg className="w-4 h-4 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>

          {/* School & mutual */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
              {person.school}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {person.mutual} mutual
            </span>
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-1.5">
            {person.skills.map((s) => (
              <Badge key={s} variant="secondary" className="text-[11px] px-2 py-0.5 bg-muted/60 text-muted-foreground border border-border">
                {s}
              </Badge>
            ))}
          </div>

          {/* Follow button */}
          <button
            onClick={() => setFollowing((f) => !f)}
            className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors border ${
              following
                ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {following ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              )}
            </svg>
            {following ? "Following" : "Follow"}
          </button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NetworkingPage() {
  const [showBanner, setShowBanner] = useState(true);
  const [dreamCompanies, setDreamCompanies] = useState<string[]>([]);
  const [showConnectModal, setShowConnectModal] = useState(false);

  useEffect(() => {
    getMe()
      .then((u) => setDreamCompanies(u.dream_companies ?? []))
      .catch(() => {});
  }, []);

  // Filter sample pool to match dream companies first; fall back to all
  const people: Connection[] = (() => {
    if (dreamCompanies.length === 0) return SAMPLE_POOL.slice(0, 6);
    const matched = SAMPLE_POOL.filter((p) =>
      dreamCompanies.some((d) => p.company.toLowerCase().includes(d.toLowerCase()))
    );
    const rest = SAMPLE_POOL.filter(
      (p) => !dreamCompanies.some((d) => p.company.toLowerCase().includes(d.toLowerCase()))
    );
    return [...matched, ...rest].slice(0, 6);
  })();

  const followingCount = people.filter((p) => p.following).length;
  const mutualTotal = people.reduce((acc, p) => acc + p.mutual, 0);

  return (
    <div className="space-y-6">
      {/* Title */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {/* LinkedIn icon */}
            <div className="w-8 h-8 rounded-lg bg-[#0A66C2]/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">People You Follow at Target Companies</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Mentors &amp; professionals at companies on your list — their path could be yours.</p>
            </div>
          </div>
          <button
            onClick={() => setShowConnectModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A66C2] hover:bg-[#004182] text-white text-sm font-semibold transition-colors shadow-lg shadow-[#0A66C2]/20"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            Connect LinkedIn
          </button>
        </div>
      </motion.div>

      {/* Info banner */}
      {showBanner && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-[#0A66C2]/30 bg-[#0A66C2]/5">
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-md bg-[#0A66C2]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Connect your LinkedIn account to automatically sync people you follow, surface warm introductions, and get notified when someone at a target company posts about internships.{" "}
                  <span className="text-foreground font-semibold">Showing sample data below.</span>
                </p>
              </div>
              <button onClick={() => setShowBanner(false)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5 text-lg leading-none">×</button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-6 flex-wrap"
      >
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shrink-0" />
          <span className="font-bold text-foreground">{people.length}</span> people at target companies
        </span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
          <span className="font-bold text-foreground">{followingCount}</span> following
        </span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0" />
          <span className="font-bold text-foreground">{mutualTotal}</span> mutual connections total
        </span>
      </motion.div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {people.map((person, i) => (
          <PersonCard key={person.id} person={person} index={i} />
        ))}
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-between flex-wrap gap-2 text-sm text-muted-foreground border-t border-border pt-4"
      >
        <p>
          Reach out to a connection for a referral — it increases your conversion odds by{" "}
          <span className="text-green-400 font-bold">+31%</span>.
        </p>
        <button
          onClick={() => setShowConnectModal(true)}
          className="text-primary hover:text-primary/80 font-semibold flex items-center gap-1 transition-colors"
        >
          Find more
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      </motion.div>

      {/* Connect LinkedIn modal */}
      {showConnectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowConnectModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#0A66C2]/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">LinkedIn Integration</h2>
                <p className="text-sm text-muted-foreground">Coming soon</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              LinkedIn OAuth integration is on the roadmap. Once connected, we&apos;ll automatically sync your connections, surface warm introductions at target companies, and alert you when your network posts about internship openings.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-green-400">✓</span> Auto-sync people you follow at dream companies
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-green-400">✓</span> Surface warm introduction paths
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-green-400">✓</span> Internship posting alerts from your network
              </div>
            </div>
            <button
              onClick={() => setShowConnectModal(false)}
              className="w-full py-2.5 rounded-xl bg-muted hover:bg-muted/70 text-sm font-semibold text-foreground transition-colors border border-border"
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
