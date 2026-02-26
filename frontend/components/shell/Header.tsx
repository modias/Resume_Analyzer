"use client";

import { Bell, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Header() {
  return (
    <header className="fixed top-0 left-[260px] right-0 h-14 z-30 flex items-center justify-between px-6 border-b border-border bg-background/80 backdrop-blur-md">
      <div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">CareerCore</span>
        </div>
        <p className="text-[11px] text-muted-foreground">Your career foundation.</p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="w-4 h-4" />
          <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground border-0 rounded-full">
            3
          </Badge>
        </Button>

        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-xs font-bold text-white cursor-pointer">
          AM
        </div>
      </div>
    </header>
  );
}
