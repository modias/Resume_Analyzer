"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { Header } from "@/components/shell/Header";
import { isAuthenticated } from "@/lib/api";

const AUTH_ROUTES = ["/login", "/register"];

export function ShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  useEffect(() => {
    if (!isAuthPage && !isAuthenticated()) {
      router.replace("/login");
    }
  }, [isAuthPage, router]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!isAuthenticated()) {
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
