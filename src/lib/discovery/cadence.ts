import type { DiscoveryCadence } from "@/generated/prisma/client";

// Approximate month/quarter as fixed day counts rather than calendar arithmetic — acceptable drift
// for a discovery schedule (unlike billing dates), keeps this a plain lookup (Code Rule 10) instead
// of a date-library dependency.
const cadenceDays: Record<DiscoveryCadence, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 90,
};

export function computeNextRunAt(cadence: DiscoveryCadence, from: Date): Date {
  const next = new Date(from);
  next.setUTCDate(next.getUTCDate() + cadenceDays[cadence]);
  return next;
}
