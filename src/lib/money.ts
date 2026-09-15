const gbpFormatter = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

// Money is stored as integer pence throughout the schema (roadmap §4 "Fair price calculation").
export function formatPence(pence: number): string {
  return gbpFormatter.format(pence / 100);
}
