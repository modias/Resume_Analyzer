"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FileText,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ClipboardList,
  AlertCircle,
  AlertTriangle,
  Volume2,
  Loader2,
  Info,
  Copy,
  Download,
  History,
  Upload,
  X,
  Check,
  Star,
  BarChart3,
  Layers,
  Eye,
  GraduationCap,
} from "lucide-react";
import {
  analyzeResume,
  exportResumePdf,
  fetchSuggestions,
  getAnalysisHistory,
  checkBackendHealth,
  formatApiError,
  BACKEND_OFFLINE_BANNER,
  isTimeoutError,
  type AnalyzeResponse,
  type AnalysisHistoryItem,
} from "@/lib/api";
import {
  parseResumeToStructured,
  replaceBulletInStructured,
  findMatchingOriginal,
  type StructuredResume,
} from "@/lib/resumeParser";
import { getCoverageStatHint } from "@/lib/coverageStatHints";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { speakText, buildAnalysisSummary } from "@/lib/elevenlabs";
import { cn } from "@/lib/utils";

const panel =
  "rounded-2xl border border-border bg-card/80 backdrop-blur shadow-[0_0_0_1px_hsl(var(--primary)/0.04),0_20px_50px_-30px_hsl(var(--primary)/0.45)]";

type Takeaway = { ok: boolean; text: string };

function buildTakeaways(r: AnalyzeResponse): Takeaway[] {
  const matched = r.required_skills.filter((s) => s.present).map((s) => s.skill);
  const missing = r.required_skills.filter((s) => !s.present).map((s) => s.skill);
  const items: Takeaway[] = [];

  if (matched.length > 0) {
    const list = matched.slice(0, 3).join(", ");
    items.push(
      r.required_coverage >= 60
        ? { ok: true, text: `Strong match on core technical skills (${list})` }
        : { ok: false, text: `Only partial coverage of required skills (${list})` }
    );
  } else if (r.required_skills.length > 0) {
    items.push({ ok: false, text: "None of the required skills were found on your resume" });
  }

  items.push(
    r.preferred_coverage >= 50
      ? { ok: true, text: "Good alignment with the preferred qualifications" }
      : { ok: false, text: "Few preferred qualifications covered — mention related experience" }
  );

  items.push(
    r.quantified_impact >= 60
      ? { ok: true, text: "Bullets show measurable, quantified impact" }
      : { ok: false, text: "Add numbers (%, $, users, time saved) to more bullets" }
  );

  if (missing.length > 0) {
    items.push({ ok: false, text: `Add ${missing.slice(0, 2).join(" and ")} to improve your match` });
  }

  return items.slice(0, 4);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ScoreRing({ value }: { value: number | null }) {
  const size = 168;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value ?? 0));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="score-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#score-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct / 100) }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ filter: "drop-shadow(0 0 8px rgba(168, 85, 247, 0.5))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-foreground">
          {value == null ? "—" : `${Math.round(value)}%`}
        </span>
        <span className="text-xs text-muted-foreground mt-1">Match Score</span>
      </div>
    </div>
  );
}

function MetricBar({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | null;
}) {
  const hint = getCoverageStatHint(label === "Required Skills" ? "Required Coverage" : label === "Preferred Skills" ? "Preferred Coverage" : label);
  const pct = Math.max(0, Math.min(100, value ?? 0));

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="flex items-center gap-1 text-sm text-foreground">
            {label}
            {hint && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={hint}
                    className="inline-flex text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    <Info className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{hint}</TooltipContent>
              </Tooltip>
            )}
          </span>
          <span className="text-sm font-semibold text-foreground">
            {value == null ? "—" : `${Math.round(value)}%`}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-400"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const [optimizedResumeText, setOptimizedResumeText] = useState("");
  const [structuredResume, setStructuredResume] = useState<StructuredResume | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [speakError, setSpeakError] = useState<string | null>(null);
  const [backendOffline, setBackendOffline] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<AnalysisHistoryItem[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkBackendHealth().then((ok) => setBackendOffline(!ok));
  }, []);

  const resetResults = () => {
    setResult(null);
    setOptimizedResumeText("");
    setStructuredResume(null);
    setApplied(new Set());
    setApplyError(null);
    setError(null);
  };

  const selectFile = (f: File | null) => {
    setFile(f);
    resetResults();
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type === "application/pdf") selectFile(f);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) selectFile(f);
  };

  const handleUploadNew = () => {
    selectFile(null);
    setSuggestionsError(null);
    fileRef.current?.click();
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryError(null);
    try {
      setHistory(await getAnalysisHistory());
    } catch (err) {
      setHistoryError(formatApiError(err, "Failed to load history."));
    }
  };

  const handleCompute = async () => {
    if (!file) {
      setError("Please upload a resume PDF first.");
      return;
    }
    if (!jd.trim()) {
      setError("Please paste a job description.");
      return;
    }

    setError(null);
    setApplyError(null);
    setCopyMessage(null);
    setDownloadError(null);
    setSuggestionsError(null);
    setScoreLoading(true);
    setSuggestionsLoading(false);
    setLoadingMessage("Parsing resume and computing match score...");
    setResult(null);
    setApplied(new Set());
    setOptimizedResumeText("");
    setStructuredResume(null);

    try {
      const data = await analyzeResume(file, jd, jobTitle, company);
      setResult(data);
      setOptimizedResumeText(data.resume_text);
      setStructuredResume(parseResumeToStructured(data.resume_text));
      setScoreLoading(false);
      setLoadingMessage("Generating AI suggestions (this may take 5–10s)...");

      setSuggestionsLoading(true);
      try {
        const { suggestions } = await fetchSuggestions(data.analysis_id);
        setResult((prev) => (prev ? { ...prev, suggestions } : prev));
      } catch (err) {
        setSuggestionsError(
          isTimeoutError(err)
            ? "AI suggestions are taking longer than usual — try again"
            : formatApiError(err, "Failed to load suggestions.")
        );
      } finally {
        setSuggestionsLoading(false);
        setLoadingMessage(null);
      }
    } catch (err) {
      setError(formatApiError(err, "Analysis failed. Please try again."));
      setScoreLoading(false);
      setSuggestionsLoading(false);
      setLoadingMessage(null);
    }
  };

  const handleApply = (i: number) => {
    if (!result || applied.has(i)) return;

    const resume = structuredResume ?? parseResumeToStructured(optimizedResumeText || result.resume_text);
    const { original, suggested } = result.suggestions[i];

    const matched = findMatchingOriginal(
      optimizedResumeText || result.resume_text,
      resume,
      original
    );

    if (!matched) {
      setApplyError("Couldn't find the original text in your resume. Try copying the suggestion manually.");
      return;
    }

    setApplyError(null);
    setOptimizedResumeText((prev) => prev.replace(matched, suggested));
    setStructuredResume(replaceBulletInStructured(resume, matched, suggested));
    setApplied((prev) => new Set(prev).add(i));
  };

  const canExport =
    applied.size > 0 &&
    result != null &&
    structuredResume != null &&
    optimizedResumeText !== result.resume_text;

  const handleCopy = async () => {
    if (!canExport) return;
    try {
      await navigator.clipboard.writeText(optimizedResumeText);
      setCopyMessage("Copied to clipboard");
      setTimeout(() => setCopyMessage(null), 2000);
    } catch {
      setCopyMessage("Failed to copy");
      setTimeout(() => setCopyMessage(null), 2000);
    }
  };

  const handleDownloadPdf = async () => {
    if (!canExport || !structuredResume) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      const payload =
        structuredResume.sections.length > 0
          ? structuredResume
          : parseResumeToStructured(optimizedResumeText);
      const blob = await exportResumePdf(payload);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "optimized-resume.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "PDF download failed.");
    } finally {
      setDownloading(false);
    }
  };

  const handleSpeak = async () => {
    if (!result) return;
    setSpeakError(null);
    setSpeaking(true);
    try {
      const summary = buildAnalysisSummary(result);
      await speakText(summary);
    } catch (err) {
      setSpeakError(err instanceof Error ? err.message : "Could not play audio.");
    } finally {
      setSpeaking(false);
    }
  };

  const missingSkills = result ? result.required_skills.filter((s) => !s.present) : [];
  const missingPreferred = result?.missing_preferred_skills ?? [];
  const takeaways = result ? buildTakeaways(result) : [];

  return (
    <div className="space-y-5">
      <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />

      {/* Title row */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
      >
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Analyze Resume</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Upload your resume and a job description to get an AI-powered match score and insights.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" onClick={openHistory} className="gap-2 text-muted-foreground hover:text-foreground">
            <History className="w-4 h-4" />
            History
          </Button>
          {result && (
            <Button onClick={handleUploadNew} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Upload className="w-4 h-4" />
              Upload New
            </Button>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {backendOffline && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {BACKEND_OFFLINE_BANNER}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inputs + compute */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Upload */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors min-h-[170px]",
              dragging
                ? "border-primary bg-primary/10"
                : "border-border bg-card/40 hover:border-primary/50 hover:bg-primary/5"
            )}
          >
            <FileText className="w-7 h-7 text-foreground/80 mb-1" />
            <p className="text-base font-semibold text-foreground">Upload Resume</p>
            <p className="text-sm text-muted-foreground">Drag and drop a PDF or click to browse</p>
            {file ? (
              <div
                onClick={(e) => e.stopPropagation()}
                className="mt-3 w-full max-w-xs flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2 cursor-default"
              >
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  aria-label="Remove file"
                  onClick={() => selectFile(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                className="mt-3 gap-2 rounded-xl bg-muted hover:bg-accent text-foreground"
              >
                <Upload className="w-4 h-4" />
                Choose File
              </Button>
            )}
          </div>

          {/* Job description */}
          <div className="rounded-2xl border border-border bg-card/60 p-4 flex flex-col gap-3">
            <p className="flex items-center gap-2 text-base font-semibold text-foreground">
              <ClipboardList className="w-5 h-5 text-muted-foreground" />
              Job Description
            </p>
            <Textarea
              placeholder="Paste the job description here..."
              className="min-h-[96px] flex-1 resize-y bg-muted/40 border-border text-sm focus:border-primary/50"
              value={jd}
              onChange={(e) => setJd(e.target.value)}
            />
          </div>
        </div>

        <AnimatePresence initial={false}>
          {(file && jd.trim()) || result || scoreLoading ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className={cn(panel, "p-4 flex flex-col md:flex-row md:items-end gap-3")}>
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Job Title <span className="opacity-60">(optional)</span>
                    </label>
                    <Input
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Data Science Intern"
                      className="h-10 text-sm bg-muted/40 border-border"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Company <span className="opacity-60">(optional)</span>
                    </label>
                    <Input
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Google"
                      className="h-10 text-sm bg-muted/40 border-border"
                    />
                  </div>
                </div>
                <Button
                  size="lg"
                  onClick={handleCompute}
                  disabled={scoreLoading || suggestionsLoading}
                  className="gap-2 h-10 bg-gradient-to-r from-violet-600 to-purple-500 hover:opacity-90 text-white shadow-[0_0_30px_-6px_rgba(139,92,246,0.7)]"
                >
                  {scoreLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Compute Match Score
                    </>
                  )}
                </Button>
              </div>
              {loadingMessage && (
                <p className="text-center text-xs text-muted-foreground mt-2">{loadingMessage}</p>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {!result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center text-center py-16"
        >
          <div className="relative w-20 h-20 mb-5">
            <div className="absolute right-0 top-0 w-14 h-16 rounded-lg border border-border bg-muted/60 rotate-12" />
            <div className="absolute left-1 bottom-0 w-14 h-16 rounded-lg border border-border bg-card flex flex-col justify-center gap-1.5 px-3 shadow-lg">
              {scoreLoading ? (
                <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
              ) : (
                <>
                  <span className="h-1 rounded-full bg-muted-foreground/40 w-full" />
                  <span className="h-1 rounded-full bg-muted-foreground/40 w-4/5" />
                  <span className="h-1 rounded-full bg-muted-foreground/40 w-full" />
                  <span className="h-1 rounded-full bg-muted-foreground/40 w-3/5" />
                </>
              )}
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-foreground">
            {scoreLoading ? "Analyzing your resume…" : "Your analysis will appear here"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            {scoreLoading
              ? "Parsing your resume and comparing it against the job description."
              : "Upload your resume and job description to see your match score, skill breakdown, and personalized insights."}
          </p>
        </motion.div>
      )}

      {result && (
      <>
      {/* Score overview */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={cn(panel, "p-6 grid grid-cols-1 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-6 items-center")}
      >
        <div className="flex justify-center lg:pr-6 lg:border-r lg:border-border">
          <ScoreRing value={result?.match_score ?? null} />
        </div>

        <div className="space-y-5">
          <MetricBar icon={Check} label="Required Skills" value={result?.required_coverage ?? null} />
          <MetricBar icon={Star} label="Preferred Skills" value={result?.preferred_coverage ?? null} />
          <MetricBar icon={BarChart3} label="Quantified Impact" value={result?.quantified_impact ?? null} />
        </div>

        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 h-full">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="w-4 h-4 text-primary" />
              Key Takeaways
            </p>
            {result && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSpeak}
                disabled={speaking}
                className="h-7 px-2 gap-1 text-xs text-primary hover:bg-primary/10"
              >
                {speaking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
                {speaking ? "Speaking…" : "Listen"}
              </Button>
            )}
          </div>
          {result ? (
            <ul className="space-y-2.5">
              {takeaways.map((t) => (
                <li key={t.text} className="flex items-start gap-2 text-sm text-foreground/90">
                  {t.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  {t.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {scoreLoading
                ? "Crunching the numbers…"
                : "Upload a resume and paste a job description, then compute your match score to see takeaways here."}
            </p>
          )}
          {speakError && <p className="text-xs text-red-400 mt-2">{speakError}</p>}
        </div>
      </motion.div>

      {/* Skills + optimized resume */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        <div className={cn(panel, "p-5")}>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
            <Layers className="w-4 h-4 text-muted-foreground" />
            Extracted Resume Skills
            {result && (
              <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">
                {result.extracted_skills.length}
              </Badge>
            )}
          </p>
          {result ? (
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {result.extracted_skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="bg-primary/15 text-foreground/90 border border-primary/25 text-xs font-normal"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Skills found on your resume will appear here.</p>
          )}
        </div>

        <div className={cn(panel, "p-5")}>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Missing Skills
            {result && (
              <Badge variant="secondary" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20">
                {missingSkills.length + missingPreferred.length}
              </Badge>
            )}
          </p>
          {!result ? (
            <p className="text-sm text-muted-foreground">Required skills you&apos;re missing will appear here.</p>
          ) : missingSkills.length + missingPreferred.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              No missing skills — great match!
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {missingSkills.map((s) => (
                  <Link key={s.skill} href={`/improve-skills?skill=${encodeURIComponent(s.skill)}`} title={`Learn ${s.skill}`}>
                    <Badge
                      variant="outline"
                      className="border-red-500/40 text-red-400 bg-red-500/10 text-xs font-normal hover:bg-red-500/20 cursor-pointer"
                    >
                      {s.skill}
                    </Badge>
                  </Link>
                ))}
                {missingPreferred.map((skill) => (
                  <Link key={skill} href={`/improve-skills?skill=${encodeURIComponent(skill)}`} title={`Learn ${skill} (preferred)`}>
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-xs font-normal hover:bg-amber-500/20 cursor-pointer"
                    >
                      {skill}
                    </Badge>
                  </Link>
                ))}
              </div>
              <Link
                href="/improve-skills"
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                {result.added_to_learning?.length
                  ? `Added ${result.added_to_learning.length} to your learning plans`
                  : "In your learning plans"}
                <ArrowRight className="w-3 h-3" />
              </Link>
            </>
          )}
        </div>

        <div className={cn(panel, "p-5 flex flex-col")}>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Optimized Resume
          </p>
          <p className="text-xs text-muted-foreground mt-1">AI-improved version tailored to this role.</p>
          <div className="flex flex-wrap gap-2 mt-4 [&>button]:flex-1">
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(true)}
              disabled={!result}
              className="gap-2 border-border bg-card/60"
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
            <Button
              onClick={handleDownloadPdf}
              disabled={!canExport || downloading}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? "Downloading…" : "Download PDF"}
            </Button>
          </div>
          {result && !canExport && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Apply at least one suggestion below to enable download.
            </p>
          )}
          {result && canExport && (
            <p className="text-[11px] text-green-400 mt-2">
              {applied.size} suggestion{applied.size === 1 ? "" : "s"} applied.
            </p>
          )}
          {downloadError && <p className="text-xs text-red-400 mt-2">{downloadError}</p>}
        </div>
      </motion.div>
      </>
      )}

      {/* Optimization suggestions */}
      <AnimatePresence>
        {result && (suggestionsLoading || result.suggestions.length > 0 || suggestionsError) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(panel, "p-5 space-y-4")}
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="w-4 h-4 text-primary" />
              Resume Optimization Suggestions
              {suggestionsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            </p>
            {suggestionsError && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {suggestionsError}
              </p>
            )}
            {suggestionsLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[0, 1].map((i) => (
                  <div key={i} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3 animate-pulse">
                    <div className="h-3 bg-muted rounded w-1/4" />
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                    <div className="h-4 bg-muted rounded w-5/6" />
                  </div>
                ))}
              </div>
            )}
            {!suggestionsLoading && applyError && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {applyError}
              </p>
            )}
            {!suggestionsLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.suggestions.map((s, i) => (
                  <div key={i} className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-3">
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium mb-1 uppercase tracking-wide">Original</p>
                      <p className="text-sm text-muted-foreground">{s.original}</p>
                    </div>
                    <div className="flex items-start gap-2 flex-1">
                      <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] text-primary font-medium mb-1 uppercase tracking-wide">Suggested</p>
                        <p className="text-sm text-foreground">{s.suggested}</p>
                        {s.reason && <p className="text-xs text-muted-foreground mt-1 italic">{s.reason}</p>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={applied.has(i) ? "secondary" : "outline"}
                      onClick={() => handleApply(i)}
                      disabled={applied.has(i)}
                      className={cn(
                        "self-start text-xs",
                        applied.has(i)
                          ? "bg-green-500/15 text-green-400 border-green-500/20 hover:bg-green-500/20"
                          : "border-primary/30 text-primary hover:bg-primary/10"
                      )}
                    >
                      {applied.has(i) ? (
                        <><CheckCircle2 className="w-3 h-3 mr-1" /> Applied</>
                      ) : (
                        "Apply Change"
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Optimized Resume</DialogTitle>
            <DialogDescription>
              {applied.size > 0
                ? `Includes ${applied.size} applied suggestion${applied.size === 1 ? "" : "s"}.`
                : "No suggestions applied yet — this is your original resume text."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/20 p-4 max-h-[60vh] overflow-y-auto">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {optimizedResumeText || result?.resume_text}
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            {copyMessage && <span className="text-xs text-green-400 mr-auto">{copyMessage}</span>}
            <Button variant="outline" onClick={handleCopy} disabled={!canExport} className="gap-2 border-border">
              <Copy className="w-4 h-4" />
              Copy
            </Button>
            <Button
              onClick={handleDownloadPdf}
              disabled={!canExport || downloading}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Analysis History</DialogTitle>
            <DialogDescription>Your 20 most recent resume analyses.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {historyError ? (
              <p className="text-sm text-red-400">{historyError}</p>
            ) : history == null ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No analyses yet.</p>
            ) : (
              history.map((h) => (
                <div key={h.id} className="flex items-center gap-4 rounded-xl border border-border bg-muted/20 p-3">
                  <div className="w-12 h-12 rounded-full border-2 border-primary/50 flex items-center justify-center text-sm font-bold text-foreground shrink-0">
                    {Math.round(h.match_score)}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {h.job_title || "Untitled role"}
                      {h.company && <span className="text-muted-foreground"> · {h.company}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {h.resume_filename} · {new Date(h.created_at).toLocaleDateString()}
                    </p>
                    {h.missing_skills.length > 0 && (
                      <p className="text-[11px] text-red-400/90 truncate mt-0.5">
                        Missing: {h.missing_skills.slice(0, 4).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
