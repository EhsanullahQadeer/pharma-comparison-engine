import type { CSSProperties } from "react";

// Staggered entrance for list items — pair with the `motion-safe:animate-fade-up` class so the
// delay only ever applies when the user hasn't asked for reduced motion. Capped so long lists
// don't leave the last rows invisible for seconds.
export const revealClass = "motion-safe:animate-fade-up";

export function revealStyle(index: number, stepMs = 60): CSSProperties {
  return { animationDelay: `${Math.min(index, 12) * stepMs}ms` };
}
