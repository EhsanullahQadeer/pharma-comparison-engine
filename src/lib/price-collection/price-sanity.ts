// Scraped prices go live without staff approval (client decision 2026-09-29), so only values that
// cannot be a real price are refused: those come from a broken scrape (a per-tablet figure read as
// the pack price, a pence/pounds mix-up, a "from £1" banner), not from the pharmacy changing price.
// A refused scrape keeps the previous price and is recorded as a failed check.

// Real published prices start around 57p a tablet (2026-09-29); 10p leaves room for bulk generics.
export const MIN_PENCE_PER_TABLET = 10;
// No real pack price moves 5× in either direction between checks; a units mix-up does (25× seen live).
export const MAX_PRICE_CHANGE_FACTOR = 5;

const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;

export function impossiblePriceReason({ itemPricePence, packQuantity, previousItemPricePence }: {
  itemPricePence: number;
  packQuantity: number;
  previousItemPricePence?: number | null;
}): string | null {
  if (!Number.isFinite(itemPricePence) || itemPricePence <= 0) return `Rejected impossible scraped price ${pounds(itemPricePence)}; the previous price was kept.`;
  if (itemPricePence / packQuantity < MIN_PENCE_PER_TABLET) {
    return `Rejected impossible scraped price ${pounds(itemPricePence)} for ${packQuantity} tablets (under ${MIN_PENCE_PER_TABLET}p a tablet); the previous price was kept.`;
  }
  if (previousItemPricePence && previousItemPricePence > 0) {
    const factor = Math.max(itemPricePence / previousItemPricePence, previousItemPricePence / itemPricePence);
    if (factor > MAX_PRICE_CHANGE_FACTOR) {
      return `Rejected impossible scraped price ${pounds(itemPricePence)}: more than ${MAX_PRICE_CHANGE_FACTOR}× away from the current ${pounds(previousItemPricePence)}; the previous price was kept. If the pharmacy really changed it, enter the new price manually.`;
    }
  }
  return null;
}
