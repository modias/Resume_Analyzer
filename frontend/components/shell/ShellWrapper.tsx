"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Sidebar } from "@/components/shell/Sidebar";
import { Header } from "@/components/shell/Header";

const AUTH_ROUTES = ["/sign-in", "/sign-up", "/login"];

/** Logged-out users can view these without redirecting to /sign-in */
function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return AUTH_ROUTES.some((r) => pathname.startsWith(r));
}

/** Signed-in pages that render full-screen, without the sidebar and header */
const BARE_ROUTES = ["/onboarding"];

export function ShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const isPublicPage = isPublicRoute(pathname);

  useEffect(() => {
    if (!isPublicPage && isLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [isPublicPage, isLoaded, isSignedIn, router]);

  if (isPublicPage) {
    return <>{children}</>;
  }

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  if (BARE_ROUTES.some((r) => pathname.startsWith(r))) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <Header />
      <main className="ml-[260px] pt-16 min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </>
  );
}
