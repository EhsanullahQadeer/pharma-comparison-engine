import type { GridLayout } from "@/generated/prisma/client";
import type { PhoneGridLayout } from "@/types/comparison";

// The phone price-grid A/B test without storing anything on visitors' devices (so no cookie
// consent is needed): every phone visitor gets the same layout for a whole ISO week, and the
// layouts take turns week by week. PRICE_GRID_PHONE_LAYOUT=compact|swipe pins one instead (e.g.
// the winner, once the test is over).

const DAY_MS = 24 * 60 * 60 * 1000;

// ISO 8601 week number (weeks start on Monday; week 1 holds the year's first Thursday), in UTC.
export function isoWeek(date: Date) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
  return Math.ceil(((day.getTime() - yearStart) / DAY_MS + 1) / 7);
}

// Odd weeks layout A (compact), even weeks layout B (swipe), unless pinned.
export function scheduledPhoneLayout(date: Date, setting: string | undefined): PhoneGridLayout {
  if (setting === "compact" || setting === "swipe") return setting;
  return isoWeek(date) % 2 === 1 ? "compact" : "swipe";
}

export const gridLayoutValues: Record<PhoneGridLayout, GridLayout> = { compact: "COMPACT", swipe: "SWIPE" };
export const phoneLayoutLabels: Record<GridLayout, string> = { COMPACT: "A: compact table", SWIPE: "B: swipe columns" };
