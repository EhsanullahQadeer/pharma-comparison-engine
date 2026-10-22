// A pharmacy's crossed-out "was" price, kept only when it reads as a real sale on the same item:
// above the current price and no more than three times it (anything further off is far more likely
// a different pack's price or an inflated RRP than a genuine reduction).
const MAX_WAS_RATIO = 3;

export function saleWasPricePence(itemPricePence: number, wasPricePence: number | undefined): number | null {
  if (wasPricePence === undefined || !Number.isInteger(wasPricePence)) return null;
  if (wasPricePence <= itemPricePence || wasPricePence > itemPricePence * MAX_WAS_RATIO) return null;
  return wasPricePence;
}

// Several offers agreeing on one price only count as a sale when they also agree on its "was" price.
export function agreedWasPrice(matches: { wasPricePence?: number }[]): number | undefined {
  const was = new Set(matches.map((match) => match.wasPricePence));
  return was.size === 1 ? matches[0]?.wasPricePence : undefined;
}

// The field written to both the Offer and its PriceHistory row on every collection, so a sale that
// has ended clears the old "was" price instead of leaving it behind.
export function wasPriceField(scraped: { itemPricePence: number; wasPricePence?: number }) {
  return { wasPricePence: saleWasPricePence(scraped.itemPricePence, scraped.wasPricePence) };
}
