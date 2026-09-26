import type { ReactNode } from "react";

// The brand's chart-1 → chart-2 gradient headline accent (same stops as the marketing sections),
// with a slow shimmer when motion is allowed.
export function GradientText({ children }: { children: ReactNode }) {
  return (
    <span className="bg-linear-to-r from-chart-1 via-chart-2 to-chart-1 bg-size-[200%_auto] bg-clip-text text-transparent motion-safe:animate-shimmer">
      {children}
    </span>
  );
}
