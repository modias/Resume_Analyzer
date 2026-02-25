"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { extractedSkills, requiredSkills, optimizationSuggestions } from "@/lib/mock";
import { Upload, FileText, Sparkles, CheckCircle2, XCircle, ArrowRight, CloudUpload } from "lucide-react";

export default function AnalyzePage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [jd, setJd] = useState("");
  const [computed, setComputed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f.name);
  };

  const handleCompute = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setComputed(true);
    }, 1500);
  };

  const toggleApply = (i: number) => {
    setApplied((prev) => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else { next.add(i); }
      return next;
    });
  };

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
            <CardContent>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 ${
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
                  onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0].name)}
                />
                {file ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-green-400" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{file}</p>
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
                placeholder="Paste the job description here..."
                className="min-h-[200px] resize-none bg-muted/40 border-border text-sm focus:border-primary/50"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

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
              Computing...
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
        {computed && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-border" />
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-xs">
                Analysis Complete
              </Badge>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Skills side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground">Extracted Resume Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {extractedSkills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="bg-primary/15 text-primary border-primary/20 text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground">Required vs Missing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {requiredSkills.map((s) => (
                      <div key={s.skill} className="flex items-center gap-2 text-sm">
                        {s.present ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <span className={s.present ? "text-foreground" : "text-muted-foreground"}>{s.skill}</span>
                        {!s.present && (
                          <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 ml-auto">
                            Missing
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Optimization suggestions */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Resume Optimization Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {optimizationSuggestions.map((s, i) => (
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
