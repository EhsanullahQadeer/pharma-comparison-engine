export type ClickReportRangePreset = "7d" | "30d" | "90d" | "all";

// The period a clicks report covers. `from` is inclusive and `to` exclusive; null means unbounded.
// `preset` is null for a custom from/to period; the `…Input` strings refill the date fields.
export type ClickReportRange = {
  preset: ClickReportRangePreset | null;
  from: Date | null;
  to: Date | null;
  fromInput: string;
  toInput: string;
  label: string;
};

// One line of a clicks report table: a pharmacy, a product, or one product at one pharmacy. The
// side a table doesn't break down by is null.
export type ClickReportRow = {
  key: string;
  pharmacy: { id: string; name: string } | null;
  product: { name: string; note: string } | null;
  clicks: number;
  // Percentage of all counted clicks in the period, to one decimal place.
  share: number;
  lastClickAt: Date;
};
