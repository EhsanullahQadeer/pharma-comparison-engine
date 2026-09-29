import type { CSSProperties } from "react";

// Staggered entrance for list items — pair with the `motion-safe:animate-fade-up` class so the
// delay only ever applies when the user hasn't asked for reduced motion. Capped so long lists
// don't leave the last rows invisible for seconds.
export const revealClass = "motion-safe:animate-fade-up";

export function revealStyle(index: number, stepMs = 60): CSSProperties {
  return { animationDelay: `${Math.min(index, 12) * stepMs}ms` };
}

// Shared lift-on-hover card treatment for the marketing pages; pair with `group` children for
// icon/arrow micro-interactions (`group-hover:*`).
export const hoverCardClass =
  "group relative h-full rounded-3xl border border-border bg-card shadow-(--shadow) transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 motion-reduce:transition-none motion-reduce:hover:translate-y-0";
