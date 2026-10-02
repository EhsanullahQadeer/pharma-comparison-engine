import type { ClickReportRange, ClickReportRangePreset } from "@/types/click-report";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// `days: null` means no start date (every click ever recorded).
export const clickReportRangePresets: Record<ClickReportRangePreset, { label: string; days: number | null }> = {
  "7d": { label: "Last 7 days", days: 7 },
  "30d": { label: "Last 30 days", days: 30 },
  "90d": { label: "Last 90 days", days: 90 },
  all: { label: "All time", days: null },
};
export const clickReportRangePresetValues = Object.keys(clickReportRangePresets) as ClickReportRangePreset[];

const DEFAULT_PRESET: ClickReportRangePreset = "30d";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// "2026-10-02" → that day's local midnight; anything else (including 2026-02-31) → null.
function parseDay(value: unknown) {
  const match = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function toDayInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDay(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function customLabel(first: Date | null, last: Date | null) {
  if (first && last) return `${formatDay(first)} to ${formatDay(last)}`;
  return first ? `From ${formatDay(first)}` : `Up to ${formatDay(last as Date)}`;
}

/**
 * The period a clicks report covers, read from the page's search params. Valid `from`/`to` days win
 * over `range`; an unknown or missing `range` falls back to the last 30 days. `to` is exclusive (the
 * midnight after the last day), so the last day is counted in full.
 */
export function parseClickReportRange(params: { range?: unknown; from?: unknown; to?: unknown }, now: Date): ClickReportRange {
  const days = [parseDay(params.from), parseDay(params.to)];
  // Dates entered the wrong way round are read as the same period.
  const [first, last] = days[0] && days[1] && days[0] > days[1] ? [days[1], days[0]] : days;

  if (first || last) {
    return {
      preset: null,
      from: first,
      to: last ? new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1) : null,
      fromInput: first ? toDayInput(first) : "",
      toInput: last ? toDayInput(last) : "",
      label: customLabel(first, last),
    };
  }

  const preset = clickReportRangePresetValues.find((value) => value === params.range) ?? DEFAULT_PRESET;
  const { label, days: presetDays } = clickReportRangePresets[preset];
  return {
    preset,
    // "Last 7 days" is today plus the six days before it.
    from: presetDays ? startOfDay(new Date(now.getTime() - (presetDays - 1) * MS_PER_DAY)) : null,
    to: null,
    fromInput: "",
    toInput: "",
    label,
  };
}
