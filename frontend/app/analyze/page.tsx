"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Sparkles, CheckCircle2, XCircle, ArrowRight, CloudUpload, AlertCircle, Building2, Volume2, Loader2 } from "lucide-react";
import { analyzeResume, type AnalyzeResponse } from "@/lib/api";
import { speakText, buildAnalysisSummary } from "@/lib/elevenlabs";

export default function AnalyzePage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const [speaking, setSpeaking] = useState(false);
  const [speakError, setSpeakError] = useState<string | null>(null);
  const [speakingJd, setSpeakingJd] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type === "application/pdf") {
      setFile(f);
      setResult(null);
      setError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
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
    setLoading(true);
    setApplied(new Set());

    try {
      const data = await analyzeResume(file, jd, jobTitle, company);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleApply = (i: number) => {
    setApplied((prev) => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else { next.add(i); }
      return next;
    });
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

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Job Title <span className="opacity-50">opt.</span></label>
                  <Input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Data Science Intern"
                    className="h-8 text-xs bg-muted/40 border-border"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
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
          disabled={loading}
          className="gap-2 px-8 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {loading ? (
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
                Analysis Complete —{" "}
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
              ].map((card) => (
                <div key={card.label} className="rounded-xl border border-border bg-muted/20 p-3 text-center">
                  <p className="text-2xl font-bold" style={{ color: card.color }}>
                    {card.value.toFixed(0)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{card.label}</p>
                </div>
              ))}
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
            {result.suggestions.length > 0 && (
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Resume Optimization Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.suggestions.map((s, i) => (
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
                        onClick={() => toggleApply(i)}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
