"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Sparkles, LogIn, UserPlus, Eye, EyeOff, Check, RefreshCw, Mail, Code2, Briefcase } from "lucide-react";
import { login, register, verifyEmail, resendVerification, updateMe } from "@/lib/api";

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

// ─── OTP Input (6 boxes with paste support) ───────────────────────────────────

function OtpInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (idx: number, char: string) => {
    const clean = char.replace(/\D/g, "").slice(-1);
    const next = value.split("").concat(Array(6).fill("")).slice(0, 6);
    next[idx] = clean;
    const joined = next.join("");
    onChange(joined);
    if (clean && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (!value[idx] && idx > 0) {
        const next = value.split("");
        next[idx - 1] = "";
        onChange(next.join(""));
        inputs.current[idx - 1]?.focus();
      } else {
        const next = value.split("");
        next[idx] = "";
        onChange(next.join(""));
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted.padEnd(6, "").slice(0, 6));
    const focusIdx = Math.min(pasted.length, 5);
    inputs.current[focusIdx]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`w-11 h-12 text-center text-lg font-bold rounded-lg border transition-all duration-150 bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
            value[i]
              ? "border-primary text-foreground"
              : "border-border text-muted-foreground"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();

  // "login" or "register" tab
  const [mode, setMode] = useState<"login" | "register">("login");

  // register steps: 0 = credentials, 1 = verify email, 2 = onboarding
  const [step, setStep] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Resend cooldown (seconds)
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    school: "",
    major: "",
  });

  // Step 1: verification code
  const [otpValue, setOtpValue] = useState("");

  // Step 2: onboarding
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setError(null);
  };

  const startCooldown = useCallback(() => {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  // ── Login handler ──────────────────────────────────────────────────────────
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
      startCooldown();
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1: verify email code ─────────────────────────────────────────────
  const handleVerifyCode = async () => {
    if (otpValue.replace(/\s/g, "").length < 6) return setError("Enter the full 6-digit code.");
    setError(null);
    setLoading(true);
    try {
      await verifyEmail(form.email, otpValue.trim());
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await resendVerification(form.email);
      startCooldown();
      setOtpValue("");
      setError(null);
    } catch {
      // silently ignore — backend always returns 200
    }
  };

  // ── Step 2: save onboarding preferences → dashboard ───────────────────────
  const handleOnboardingSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (selectedLang || selectedJob) {
        await updateMe({
          skills: selectedLang ? [selectedLang] : [],
          dream_job: selectedJob ?? "",
        });
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: "login" | "register") => {
    setMode(m);
    setStep(0);
    setError(null);
    setOtpValue("");
    setSelectedLang(null);
    setSelectedJob(null);
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
                  <StepDots step={0} total={3} />
                  <p className="text-xs text-muted-foreground text-center -mt-2 mb-3">Step 1 of 3 — Create your account</p>

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

              {/* ── REGISTER STEP 1: email verification ── */}
              {mode === "register" && step === 1 && (
                <motion.div
                  key="reg-1"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className="space-y-5"
                >
                  <StepDots step={1} total={3} />

                  {/* Icon + heading */}
                  <div className="flex flex-col items-center gap-2 -mt-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Check your inbox</p>
                    <p className="text-xs text-muted-foreground text-center leading-relaxed">
                      We sent a 6-digit code to{" "}
                      <span className="text-foreground font-medium">{form.email}</span>.
                      Copy and paste it below.
                    </p>
                  </div>

                  <OtpInput value={otpValue} onChange={(v) => { setOtpValue(v); setError(null); }} />

                  {error && <ErrorBanner message={error} />}

                  <Button
                    type="button"
                    size="lg"
                    disabled={loading || otpValue.replace(/\s/g, "").length < 6}
                    onClick={handleVerifyCode}
                    className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {loading ? <Spinner label="Verifying…" /> : <><Check className="w-4 h-4" /> Verify Code</>}
                  </Button>

                  {/* Resend */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendCooldown > 0}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className="w-3 h-3" />
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── REGISTER STEP 2: onboarding — coding lang + dream job ── */}
              {mode === "register" && step === 2 && (
                <motion.div
                  key="reg-2"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className="space-y-5"
                >
                  <StepDots step={2} total={3} />

                  <div className="text-center -mt-2">
                    <p className="text-sm font-semibold text-foreground">Set up your profile</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Step 3 of 3 — Personalize your experience</p>
                  </div>

                  {/* Favorite coding language */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-primary" />
                      <p className="text-xs font-semibold text-foreground">Favorite coding language</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                      {CODING_LANGUAGES.map((lang) => (
                        <Chip
                          key={lang}
                          label={lang}
                          selected={selectedLang === lang}
                          onClick={() => setSelectedLang(selectedLang === lang ? null : lang)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Dream job role */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-primary" />
                      <p className="text-xs font-semibold text-foreground">Dream job role</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                      {DREAM_JOB_ROLES.map((role) => (
                        <Chip
                          key={role}
                          label={role}
                          selected={selectedJob === role}
                          onClick={() => setSelectedJob(selectedJob === role ? null : role)}
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
