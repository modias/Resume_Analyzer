"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { Header } from "@/components/shell/Header";
import { isAuthenticated } from "@/lib/api";

const AUTH_ROUTES = ["/login", "/register"];

/** Logged-out users can view these without redirecting to /login */
function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return AUTH_ROUTES.some((r) => pathname.startsWith(r));
}

export function ShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicPage = isPublicRoute(pathname);
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const ok = isAuthenticated();
    setAuthed(ok);
    if (!isPublicPage && !ok) {
      router.replace("/login");
    }
  }, [isPublicPage, router]);

  if (isPublicPage) {
    return <>{children}</>;
  }

  if (!mounted) {
    return null;
  }

  if (!authed) {
    return null;
  }

  return (
    <>
      <Sidebar />
      <Header />
      <main className="ml-[260px] pt-14 min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </>
  );
}
