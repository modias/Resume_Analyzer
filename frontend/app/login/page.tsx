"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Sparkles, LogIn, UserPlus, Eye, EyeOff, Check, ChevronRight, ChevronLeft } from "lucide-react";
import { login, register } from "@/lib/api";

// ─── Skill & company options ──────────────────────────────────────────────────

const SKILL_OPTIONS = [
  "Python", "SQL", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
  "Scikit-learn", "R", "Tableau", "Power BI", "AWS", "GCP", "Azure", "Docker",
  "Kubernetes", "Spark", "Airflow", "dbt", "Kafka", "JavaScript", "TypeScript",
  "Java", "C++", "Go", "Rust", "Statistics", "A/B Testing", "NLP", "Computer Vision",
  "Git", "REST APIs", "Pandas", "NumPy", "PostgreSQL", "MongoDB",
];

const COMPANY_OPTIONS = [
  "Google", "Meta", "Amazon", "Apple", "Microsoft", "Netflix", "Stripe",
  "Airbnb", "Uber", "Lyft", "Spotify", "Salesforce", "Adobe", "Twitter/X",
  "LinkedIn", "Snap", "Coinbase", "Databricks", "OpenAI", "Anthropic",
  "Palantir", "Nvidia", "Intel", "IBM", "Oracle",
];

// ─── Small toggle chip ────────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
        selected
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-muted/40 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {selected && <Check className="w-3 h-3" />}
      {label}
    </button>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === step
              ? "w-5 h-1.5 bg-primary"
              : i < step
              ? "w-1.5 h-1.5 bg-primary/50"
              : "w-1.5 h-1.5 bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState(0); // 0=credentials, 1=skills, 2=companies
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    school: "",
    major: "",
  });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setError(null);
  };

  const toggleSkill = (s: string) =>
    setSelectedSkills((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const toggleCompany = (c: string) =>
    setSelectedCompanies((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  // Login: single step
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(form.email, form.password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Register step 0 → validate and advance
  const handleCredentialsNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError("Name is required.");
    if (!form.email.trim()) return setError("Email is required.");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    setStep(1);
  };

  // Register final submit (step 2)
  const handleRegisterSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await register(
        form.name, form.email, form.password,
        form.school, form.major,
        selectedSkills, selectedCompanies,
      );
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: "login" | "register") => {
    setMode(m);
    setStep(0);
    setError(null);
    setSelectedSkills([]);
    setSelectedCompanies([]);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">CareerCore</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered resume analysis for smarter internship applications
          </p>
        </div>

        <Card className="border-border bg-card shadow-2xl">
          <CardHeader className="pb-4">
            {/* Tab toggle */}
            <div className="flex gap-1 p-1 rounded-lg bg-muted/40 border border-border">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                    mode === m
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "login" ? <LogIn className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                  {m === "login" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">

              {/* ── LOGIN ── */}
              {mode === "login" && (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  onSubmit={handleLogin}
                  className="space-y-3"
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Email</label>
                    <Input type="email" value={form.email} onChange={update("email")}
                      placeholder="you@example.com" required autoComplete="email"
                      className="h-10 text-sm bg-muted/40 border-border focus:border-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Password</label>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} value={form.password}
                        onChange={update("password")} placeholder="••••••••" required
                        className="h-10 text-sm bg-muted/40 border-border focus:border-primary/50 pr-10"
                        autoComplete="current-password" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {error && <ErrorBanner message={error} />}
                  <Button type="submit" size="lg" disabled={loading}
                    className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground mt-1">
                    {loading ? <Spinner label="Signing in…" /> : <><LogIn className="w-4 h-4" /> Sign In</>}
                  </Button>
                </motion.form>
              )}

              {/* ── REGISTER STEP 0: credentials ── */}
              {mode === "register" && step === 0 && (
                <motion.form
                  key="reg-0"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  onSubmit={handleCredentialsNext}
                  className="space-y-3"
                >
                  <StepDots step={0} total={3} />
                  <p className="text-xs text-muted-foreground text-center -mt-2 mb-3">Step 1 of 3 — Your account</p>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                    <Input value={form.name} onChange={update("name")} placeholder="Alex Johnson" required
                      className="h-10 text-sm bg-muted/40 border-border focus:border-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Email</label>
                    <Input type="email" value={form.email} onChange={update("email")}
                      placeholder="you@example.com" required autoComplete="email"
                      className="h-10 text-sm bg-muted/40 border-border focus:border-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Password</label>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} value={form.password}
                        onChange={update("password")} placeholder="••••••••" required minLength={8}
                        className="h-10 text-sm bg-muted/40 border-border focus:border-primary/50 pr-10"
                        autoComplete="new-password" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">School <span className="opacity-50">(optional)</span></label>
                      <Input value={form.school} onChange={update("school")} placeholder="UC Berkeley"
                        className="h-10 text-sm bg-muted/40 border-border focus:border-primary/50" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Major <span className="opacity-50">(optional)</span></label>
                      <Input value={form.major} onChange={update("major")} placeholder="Computer Science"
                        className="h-10 text-sm bg-muted/40 border-border focus:border-primary/50" />
                    </div>
                  </div>
                  {error && <ErrorBanner message={error} />}
                  <Button type="submit" size="lg"
                    className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground mt-1">
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </motion.form>
              )}

              {/* ── REGISTER STEP 1: skills ── */}
              {mode === "register" && step === 1 && (
                <motion.div
                  key="reg-1"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className="space-y-4"
                >
                  <StepDots step={1} total={3} />
                  <div className="text-center -mt-2">
                    <p className="text-sm font-semibold text-foreground">Your Skills</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Step 2 of 3 — Pick what you know</p>
                  </div>

                  <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pr-1">
                    {SKILL_OPTIONS.map((s) => (
                      <Chip key={s} label={s} selected={selectedSkills.includes(s)} onClick={() => toggleSkill(s)} />
                    ))}
                  </div>

                  {selectedSkills.length > 0 && (
                    <p className="text-xs text-primary font-medium">{selectedSkills.length} skill{selectedSkills.length !== 1 ? "s" : ""} selected</p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={() => setStep(0)}
                      className="flex-1 gap-1 border-border">
                      <ChevronLeft className="w-4 h-4" /> Back
                    </Button>
                    <Button type="button" onClick={() => setStep(2)}
                      className="flex-1 gap-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                      Next <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* ── REGISTER STEP 2: dream companies ── */}
              {mode === "register" && step === 2 && (
                <motion.div
                  key="reg-2"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className="space-y-4"
                >
                  <StepDots step={2} total={3} />
                  <div className="text-center -mt-2">
                    <p className="text-sm font-semibold text-foreground">Dream Companies</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Step 3 of 3 — Where do you want to work?</p>
                  </div>

                  <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pr-1">
                    {COMPANY_OPTIONS.map((c) => (
                      <Chip key={c} label={c} selected={selectedCompanies.includes(c)} onClick={() => toggleCompany(c)} />
                    ))}
                  </div>

                  {selectedCompanies.length > 0 && (
                    <p className="text-xs text-primary font-medium">{selectedCompanies.length} compan{selectedCompanies.length !== 1 ? "ies" : "y"} selected</p>
                  )}

                  {error && <ErrorBanner message={error} />}

                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}
                      className="flex-1 gap-1 border-border">
                      <ChevronLeft className="w-4 h-4" /> Back
                    </Button>
                    <Button type="button" disabled={loading} onClick={handleRegisterSubmit}
                      className="flex-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                      {loading ? <Spinner label="Creating…" /> : <><UserPlus className="w-4 h-4" /> Create Account</>}
                    </Button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Sign in / Sign up switch */}
            {mode === "login" ? (
              <p className="text-center text-xs text-muted-foreground mt-4">
                Don&apos;t have an account?{" "}
                <button onClick={() => switchMode("register")} className="text-primary hover:underline font-medium">
                  Sign up free
                </button>
              </p>
            ) : step === 0 ? (
              <p className="text-center text-xs text-muted-foreground mt-4">
                Already have an account?{" "}
                <button onClick={() => switchMode("login")} className="text-primary hover:underline font-medium">
                  Sign in
                </button>
              </p>
            ) : null}
          </CardContent>
        </Card>

        <p className="text-center mt-6">
          <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
            Free · No credit card required
          </Badge>
        </p>
      </motion.div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      {message}
    </motion.div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
      {label}
    </>
  );
}
