"use client";

import { useAuth } from "@clerk/nextjs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter } from "@/lib/api";

function ClerkTokenBridge() {
  const { getToken } = useAuth();
  // Set during render so it is in place before any child effect calls the API.
  setAuthTokenGetter(getToken);
  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={100}>
      <ClerkTokenBridge />
      {children}
    </TooltipProvider>
  );
}
