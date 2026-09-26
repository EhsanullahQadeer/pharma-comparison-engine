import { cn } from "@/lib/utils";

import type { CSSProperties } from "react";

// Relative price bar (value vs the most expensive in view). Decorative: the number beside it is
// the accessible value, so the bar itself is hidden from assistive tech.
export function PriceBar({ value, max, highlight, style }: { value: number; max: number; highlight?: boolean; style?: CSSProperties }) {
  const percent = max > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0;
  return (
    <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full origin-left rounded-full motion-safe:animate-grow-x", highlight ? "bg-linear-to-r from-chart-1 to-primary" : "bg-linear-to-r from-chart-2/70 to-chart-2")}
        style={{ width: `${percent}%`, ...style }}
      />
    </div>
  );
}
