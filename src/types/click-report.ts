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
  // Average total to pay shown to the visitors who clicked; null where no click recorded a price
  // (clicks from before prices were recorded) or the table isn't about one product.
  averagePricePence: number | null;
  lastClickAt: Date;
};

// One line of a marketing breakdown of the same clicks: an area, a device, a browser or a page.
export type ClickBreakdownRow = {
  key: string;
  label: string;
  clicks: number;
  share: number;
  lastClickAt: Date;
};
