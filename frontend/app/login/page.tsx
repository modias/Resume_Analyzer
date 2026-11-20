"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Sparkles, LogIn, UserPlus, Eye, EyeOff, Check, Code2, Briefcase } from "lucide-react";
import { login, register, updateMe, isAuthenticated, setToken, setCachedUser, checkBackendHealth, formatApiError, BACKEND_OFFLINE_BANNER } from "@/lib/api";

// ─── Options ──────────────────────────────────────────────────────────────────

const CODING_LANGUAGES = [
  "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go",
  "Rust", "Swift", "Kotlin", "Ruby", "PHP", "Scala", "R", "MATLAB",
  "SQL", "Bash", "Dart", "Elixir", "Haskell",
];

const DREAM_JOB_ROLES = [
  "Software Engineer", "Frontend Engineer", "Backend Engineer", "Full-Stack Engineer",
  "Data Scientist", "ML Engineer", "AI Researcher", "Data Engineer",
  "DevOps / SRE", "Cloud Engineer", "Security Engineer", "Mobile Engineer",
  "Product Manager", "UX Designer", "Quantitative Analyst", "Blockchain Engineer",
];

// ─── Small toggle chip ────────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  onClick,
  icon,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
        selected
          ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
          : "bg-muted/40 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
      }`}
    >
      {selected ? <Check className="w-3 h-3" /> : icon}
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/dashboard");
      return;
    }

    // Handle Google OAuth redirect — ?token=...&user=...
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const userParam = params.get("user");
    const googleError = params.get("google_error");

    if (googleError) {
      window.history.replaceState({}, "", "/login");
      setError("Google sign-in failed. Make sure the Google OAuth client has the redirect URI http://localhost:8000/auth/google/callback configured.");
      return;
    }

    if (token) {
      setToken(token);
      if (userParam) {
        try {
          setCachedUser(JSON.parse(decodeURIComponent(userParam)));
        } catch { /* ignore parse errors */ }
      }
      router.replace("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    checkBackendHealth().then((ok) => setBackendOffline(!ok));
  }, []);

  // "login" or "register" tab (URL ?register=1 opens Create Account)
  const [mode, setMode] = useState<"login" | "register">("login");

  useLayoutEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("register") === "1" || params.get("mode") === "register") {
      setMode("register");
    }
  }, []);

  // register steps: 0 = credentials, 1 = onboarding
  const [step, setStep] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendOffline, setBackendOffline] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    school: "",
    major: "",
  });

  // Step 1: onboarding
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setError(null);
  };

  // ── Login handler ──────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(form.email, form.password);
      router.push("/dashboard");
    } catch (err) {
      setError(formatApiError(err, "Something went wrong."));
    } finally {
      setLoading(false);
    }
  };

  // ── Step 0: submit credentials → call register() → email sent ─────────────
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError("Name is required.");
    if (!form.email.trim()) return setError("Email is required.");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.school, form.major);
      setStep(1);
    } catch (err) {
      setError(formatApiError(err, "Something went wrong."));
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    setSelectedLangs((prev) => (
      prev.includes(lang) ? prev.filter((item) => item !== lang) : [...prev, lang]
    ));
  };

  const toggleDreamJob = (role: string) => {
    setSelectedJobs((prev) => (
      prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]
    ));
  };

  // ── Step 2: save onboarding preferences → dashboard ───────────────────────
  const handleOnboardingSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (selectedLangs.length > 0 || selectedJobs.length > 0) {
        await updateMe({
          skills: selectedLangs,
          // Backend currently stores dream_job as a single string field.
          dream_job: selectedJobs.join(", "),
        });
      }
      router.push("/dashboard");
    } catch (err) {
      setError(formatApiError(err, "Something went wrong."));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: "login" | "register") => {
    setMode(m);
    setStep(0);
    setError(null);
    setSelectedLangs([]);
    setSelectedJobs([]);
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
          {backendOffline && (
            <div className="mx-6 mt-6 flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {BACKEND_OFFLINE_BANNER}
            </div>
          )}
          <CardHeader className="pb-4">
            {/* Tab toggle — hide on verify/onboarding steps */}
            {(mode === "login" || step === 0) && (
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
            )}
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
                  <GoogleButton />
                  <Divider />
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
                  onSubmit={handleCredentialsSubmit}
                  className="space-y-3"
                >
                  <StepDots step={0} total={2} />
                  <p className="text-xs text-muted-foreground text-center -mt-2 mb-3">Step 1 of 2 — Create your account</p>
                  <GoogleButton label="Sign up with Google" />
                  <Divider />

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
                  <Button type="submit" size="lg" disabled={loading}
                    className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground mt-1">
                    {loading ? <Spinner label="Creating account…" /> : <><UserPlus className="w-4 h-4" /> Continue</>}
                  </Button>
                </motion.form>
              )}

              {/* ── REGISTER STEP 1: onboarding — coding lang + dream job ── */}
              {mode === "register" && step === 1 && (
                <motion.div
                  key="reg-2"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className="space-y-5"
                >
                  <StepDots step={1} total={2} />

                  <div className="text-center -mt-2">
                    <p className="text-sm font-semibold text-foreground">Set up your profile</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Step 2 of 2 — Personalize your experience</p>
                  </div>

                  {/* Favorite coding language(s) */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-primary" />
                      <p className="text-xs font-semibold text-foreground">Favorite coding languages</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                      {CODING_LANGUAGES.map((lang) => (
                        <Chip
                          key={lang}
                          label={lang}
                          selected={selectedLangs.includes(lang)}
                          onClick={() => toggleLanguage(lang)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Dream job role(s) */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-primary" />
                      <p className="text-xs font-semibold text-foreground">Dream job roles</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                      {DREAM_JOB_ROLES.map((role) => (
                        <Chip
                          key={role}
                          label={role}
                          selected={selectedJobs.includes(role)}
                          onClick={() => toggleDreamJob(role)}
                        />
                      ))}
                    </div>
                  </div>

                  {error && <ErrorBanner message={error} />}

                  <Button
                    type="button"
                    size="lg"
                    disabled={loading}
                    onClick={handleOnboardingSubmit}
                    className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {loading ? <Spinner label="Saving…" /> : <><Sparkles className="w-4 h-4" /> Go to Dashboard</>}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    You can always update these in your settings.
                  </p>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Sign in / Sign up switch — only on initial steps */}
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

        <div className="text-center mt-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] border border-border text-muted-foreground">
            Free · No credit card required
          </span>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  const [pending, setPending] = useState(false);
  return (
    <a
      href={`${API_BASE}/auth/google`}
      onClick={() => setPending(true)}
      className="flex w-full items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 text-sm font-semibold text-foreground transition-colors"
    >
      {pending ? (
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
          className="w-4 h-4 border-2 border-muted-foreground/30 border-t-foreground rounded-full" />
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-.9 2.4-1.9 3.1l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z" />
          <path fill="#34A853" d="M5.3 14.3l-.8.6-2.5 1.9C3.6 20.1 7.5 22.5 12 22.5c2.7 0 5-.9 6.7-2.4l-3.1-2.4c-.9.6-2 .9-3.6.9-2.8 0-5.1-1.9-6-4.4z" />
          <path fill="#4A90E2" d="M3.9 7.3C3.3 8.5 3 9.7 3 11s.3 2.5.9 3.7c0 .1 2.8-2.2 2.8-2.2-.2-.5-.3-1-.3-1.5s.1-1 .3-1.5L3.9 7.3z" />
          <path fill="#FBBC05" d="M12 5.4c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.4 14.7 1.5 12 1.5 7.5 1.5 3.6 3.9 2 7.3l2.8 2.2C5.7 7.2 8.1 5.4 12 5.4z" />
        </svg>
      )}
      {pending ? "Redirecting to Google…" : label}
    </a>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground">or</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

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
