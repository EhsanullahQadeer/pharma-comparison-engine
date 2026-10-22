"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/common/button";
import { getThemeSnapshot, setTheme, subscribeToTheme } from "@/lib/theme-store";

function getServerSnapshot() {
  return false;
}

export function ThemeToggle({ className }: { className?: string }) {
  const isDark = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerSnapshot);

  return (
    <Button type="button" variant="ghost" size="icon" className={className} onClick={() => setTheme(!isDark)} aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}>
      {isDark ? <Sun aria-hidden="true" className="size-4" /> : <Moon aria-hidden="true" className="size-4" />}
    </Button>
  );
}
