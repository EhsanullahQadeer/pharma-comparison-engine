"use client";

import { useSyncExternalStore } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/card";
import { getThemeSnapshot, subscribeToTheme } from "@/lib/theme-store";

import type { ReactNode } from "react";

// Tailwind's --color-chart-1..5 (globals.css) resolve from these --chart-1..5 custom properties —
// referencing them directly keeps every chart on the theme's palette with light/dark handled for
// free, instead of hardcoding hex values (UI Rule 3).
export const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function getServerSnapshot() {
  return false;
}

export function ChartCard({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}) {
  // Recharts' ResponsiveContainer can be left with stale internal measurements after a live
  // dark/light toggle (no layout size actually changes, so its own resize observer never fires
  // again) — remounting the chart subtree on theme change forces a fresh measurement instead.
  const isDark = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerSnapshot);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full" key={isDark ? "dark" : "light"}>{children}</div>
      </CardContent>
    </Card>
  );
}

export function EmptyChartState({ message = "No data yet." }: { message?: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{message}</div>;
}
