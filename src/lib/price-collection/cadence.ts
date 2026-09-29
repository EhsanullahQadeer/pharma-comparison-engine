import type { PriceScrapeCadence } from "@/generated/prisma/client";

const cadenceDays: Record<Exclude<PriceScrapeCadence, "MANUAL">, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
};

// When a scheduled match is next due after `from`; MANUAL matches are never scheduled.
export function nextScrapeAt(cadence: PriceScrapeCadence, from = new Date()) {
  if (cadence === "MANUAL") return null;
  const date = new Date(from);
  date.setDate(date.getDate() + cadenceDays[cadence]);
  return date;
}
