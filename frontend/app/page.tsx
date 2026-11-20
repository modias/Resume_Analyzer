"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAuthenticated } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 max-w-lg text-center space-y-8"
      >
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-2">
          <Sparkles className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">CareerCore</h1>
          <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
            AI-powered resume analysis and job insights for smarter internship and early-career applications.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2 bg-primary hover:bg-primary/90">
            <Link href="/login">
              <LogIn className="w-4 h-4" />
              Sign in
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2 border-border">
            <Link href="/login?register=1">
              <UserPlus className="w-4 h-4" />
              Create account
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
