"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Sparkles, CheckCircle2, XCircle, ArrowRight, CloudUpload, AlertCircle, Building2, Volume2, Loader2, Info, Copy, Download } from "lucide-react";
import {
  analyzeResume,
  exportResumePdf,
  fetchSuggestions,
  checkBackendHealth,
  formatApiError,
  BACKEND_OFFLINE_BANNER,
  isTimeoutError,
  type AnalyzeResponse,
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
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkBackendHealth().then((ok) => setBackendOffline(!ok));
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type === "application/pdf") {
      setFile(f);
      setResult(null);
      setOptimizedResumeText("");
      setStructuredResume(null);
      setApplied(new Set());
      setApplyError(null);
      setError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
      setOptimizedResumeText("");
      setStructuredResume(null);
      setApplied(new Set());
      setApplyError(null);
      setError(null);
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

  const scoreColor =
    result
      ? result.match_score >= 72
        ? "text-green-400"
        : result.match_score >= 50
        ? "text-yellow-400"
        : "text-red-400"
      : "";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Analyze Resume</h1>
        <p className="text-muted-foreground text-sm mt-1">Upload your resume and paste a job description to compute your match score</p>
      </motion.div>

      {/* Backend offline banner */}
      <AnimatePresence>
        {backendOffline && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {BACKEND_OFFLINE_BANNER}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-border bg-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Upload Resume
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 ${
                  dragging
                    ? "border-primary bg-primary/10"
                    : file
                    ? "border-green-500/40 bg-green-500/5"
                    : "border-border hover:border-primary/50 hover:bg-accent"
                }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {file ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-green-400" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">Click to change file</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <CloudUpload className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Drop your PDF here</p>
                    <p className="text-xs text-muted-foreground">or click to browse</p>
                    <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                      PDF only · Max 5MB
                    </Badge>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 items-end">
                <div className="space-y-1">
                  <label className="h-4 flex items-center text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    Job Title <span className="opacity-50">opt.</span>
                  </label>
                  <Input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Data Science Intern"
                    className="h-8 text-xs bg-muted/40 border-border"
                  />
                </div>
                <div className="space-y-1">
                  <label className="h-4 flex items-center gap-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    <Building2 className="w-3 h-3" /> Company <span className="opacity-50">opt.</span>
                  </label>
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Google"
                    className="h-8 text-xs bg-muted/40 border-border"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* JD */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-border bg-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Job Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste the full job description here..."
                className="min-h-[220px] resize-none bg-muted/40 border-border text-sm focus:border-primary/50"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex justify-center">
        <Button
          size="lg"
          onClick={handleCompute}
          disabled={scoreLoading || suggestionsLoading}
          className="gap-2 px-8 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {scoreLoading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
              />
              Analyzing…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Compute Match Score
            </>
          )}
        </Button>
      </motion.div>

      {loadingMessage && (
        <p className="text-center text-xs text-muted-foreground -mt-4">{loadingMessage}</p>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-border" />
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-xs px-3">
                {suggestionsLoading ? "Match Score Ready —" : "Analysis Complete —"}{" "}
                <span className={`font-bold ml-1 ${scoreColor}`}>
                  {result.match_score.toFixed(1)}% Match
                </span>
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSpeak}
                disabled={speaking}
                className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10 h-7 px-3"
              >
                {speaking ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Speaking…</>
                ) : (
                  <><Volume2 className="w-3 h-3" /> Listen</>
                )}
              </Button>
              <div className="h-px flex-1 bg-border" />
            </div>

            {speakError && (
              <p className="text-xs text-red-400 text-center -mt-2">{speakError}</p>
            )}

            {/* Coverage stat cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Required Coverage", value: result.required_coverage, color: "#6366f1" },
                { label: "Preferred Coverage", value: result.preferred_coverage, color: "#8b5cf6" },
                { label: "Quantified Impact", value: result.quantified_impact, color: "#ec4899" },
              ].map((card) => {
                const hint = getCoverageStatHint(card.label);
                return (
                  <div key={card.label} className="rounded-xl border border-border bg-muted/20 p-3 text-center">
                    <p className="text-2xl font-bold" style={{ color: card.color }}>
                      {card.value.toFixed(0)}%
                    </p>
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      <p className="text-[10px] text-muted-foreground">{card.label}</p>
                      {hint && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label={hint}
                              className="inline-flex shrink-0 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                            >
                              <Info className="w-2.5 h-2.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="center">
                            {hint}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Skills side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Extracted Resume Skills
                    <Badge variant="secondary" className="ml-2 text-[10px] bg-muted text-muted-foreground">
                      {result.extracted_skills.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.extracted_skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="bg-primary/15 text-primary border-primary/20 text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    Missing Skills
                    <Badge variant="secondary" className="ml-1 text-[10px] bg-red-500/10 text-red-400 border-red-500/20">
                      {result.required_skills.filter((s) => !s.present).length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.required_skills.filter((s) => !s.present).length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      No missing skills — great match!
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {result.required_skills
                        .filter((s) => !s.present)
                        .map((s) => (
                          <Badge key={s.skill} variant="outline" className="border-red-500/30 text-red-400 bg-red-500/5 text-xs">
                            {s.skill}
                          </Badge>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Optimization suggestions */}
            {(suggestionsLoading || result.suggestions.length > 0 || suggestionsError) && (
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Resume Optimization Suggestions
                    {suggestionsLoading && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {suggestionsError && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {suggestionsError}
                    </p>
                  )}
                  {suggestionsLoading && (
                    <div className="space-y-3">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3 animate-pulse">
                          <div className="h-3 bg-muted rounded w-1/4" />
                          <div className="h-4 bg-muted rounded w-full" />
                          <div className="h-3 bg-muted rounded w-1/3" />
                          <div className="h-4 bg-muted rounded w-5/6" />
                          <div className="h-7 bg-muted rounded w-24" />
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
                  {!suggestionsLoading && result.suggestions.map((s, i) => (
                    <div key={i} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wide">Original</p>
                        <p className="text-sm text-muted-foreground">{s.original}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-primary font-medium mb-1 uppercase tracking-wide">Suggested</p>
                          <p className="text-sm text-foreground">{s.suggested}</p>
                          {s.reason && (
                            <p className="text-xs text-muted-foreground mt-1 italic">{s.reason}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={applied.has(i) ? "secondary" : "outline"}
                        onClick={() => handleApply(i)}
                        disabled={applied.has(i)}
                        className={applied.has(i)
                          ? "text-xs bg-green-500/15 text-green-400 border-green-500/20 hover:bg-green-500/20"
                          : "text-xs border-primary/30 text-primary hover:bg-primary/10"}
                      >
                        {applied.has(i) ? (
                          <><CheckCircle2 className="w-3 h-3 mr-1" /> Applied</>
                        ) : (
                          "Apply Change"
                        )}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {result.resume_text && (
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Optimized Resume
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopy}
                        disabled={!canExport}
                        className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10 h-7 px-3"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadPdf}
                        disabled={!canExport || downloading}
                        className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10 h-7 px-3"
                      >
                        {downloading ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> Downloading…</>
                        ) : (
                          <><Download className="w-3 h-3" /> Download PDF</>
                        )}
                      </Button>
                    </div>
                  </div>
                  {copyMessage && (
                    <p className="text-xs text-green-400 mt-1">{copyMessage}</p>
                  )}
                  {downloadError && (
                    <p className="text-xs text-red-400 mt-1">{downloadError}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-border bg-muted/20 p-4 max-h-64 overflow-y-auto">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {optimizedResumeText || result.resume_text}
                    </p>
                  </div>
                  {!canExport && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Apply at least one suggestion to enable copy and download.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
