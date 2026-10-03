import { htmlTextItems } from "@/lib/price-collection/html-text";
import type { ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { brandSideMatches, labelMatchesVariant, type VariantSpec } from "@/lib/price-collection/variant-label";

// Options shown as labelled fields under a product name, on a page listing several treatments
// (e.g. Phlo Clinic's ED page):
//   Sildenafil
//   Strength: 25mg   Quantity / description: 4   £9.99
//   Strength: 50mg   Quantity / description: 8   £16.99
//   Tadalafil
//   Strength: 10mg   Quantity / description: 4   £12.99
// Each row belongs to the product name above it, which also decides branded vs generic; a name for
// a medicine we don't compare closes the section so its rows are never read as the previous one's.

const COMPARED_PRODUCT = /\b(?:viagra|sildenafil|cialis|tadalafil)\b/i;
const OTHER_PRODUCT = /\b(?:vardenafil|levitra|avanafil|spedra|eroxon|vitaros|alprostadil)\b/i;
const STRENGTH_LABEL = /^strength\s*:?$/i;
const QUANTITY_LABEL = /^(?:quantity|pack\s*size|tablets)\b[^£]*:?$/i;
const STRENGTH = /^\d{1,3}(?:\.\d+)?\s*mg$/i;
const COUNT = /^(\d{1,3})(?:\s*(?:tablets?|capsules?))?$/i;
const PRICE = /^£\s*(\d+(?:\.\d{1,2})?)$/;
// A product name is a short standalone item ("Sildenafil", "Viagra Connect"), not a sentence.
const MAX_NAME_LENGTH = 40;
// How far after the strength its quantity label may sit.
const ROW_LOOKAHEAD = 4;

function isProductName(item: string) {
  return item.length <= MAX_NAME_LENGTH && !item.includes("£") && !item.endsWith(":") && !STRENGTH.test(item);
}

export function pickLabelledOptionRowPrice(html: string, matchedTokens: string[], variant: VariantSpec, sourceUrl: string): ScrapedPrice | undefined {
  const items = htmlTextItems(html);
  const matches: { itemPricePence: number; evidence: string }[] = [];
  let product: string | undefined;
  items.forEach((item, index) => {
    if (isProductName(item)) {
      if (OTHER_PRODUCT.test(item)) product = undefined;
      else if (COMPARED_PRODUCT.test(item)) product = item;
    }
    const strength = items[index + 1];
    if (!product || !STRENGTH_LABEL.test(item) || !strength || !STRENGTH.test(strength)) return;
    // "Strength:" <mg>, then "Quantity…:" <count> <£price> within the next few items.
    const quantityAt = items.slice(index + 2, index + 2 + ROW_LOOKAHEAD).findIndex((next) => QUANTITY_LABEL.test(next));
    if (quantityAt < 0) return;
    const count = items[index + 2 + quantityAt + 1]?.match(COUNT)?.[1];
    const price = items[index + 2 + quantityAt + 2]?.match(PRICE)?.[1];
    if (!count || !price) return;
    if (!brandSideMatches(product, "", matchedTokens[0], variant.generic)) return;
    if (!labelMatchesVariant(`${product} ${strength} ${count} tablets`, matchedTokens, variant)) return;
    matches.push({ itemPricePence: Math.round(Number(price) * 100), evidence: `${product}: ${strength} × ${count} tablets` });
  });
  if (new Set(matches.map((match) => match.itemPricePence)).size !== 1) return undefined;
  return {
    ...matches[0],
    deliveryFeePence: 0,
    deliveryAssumption: "As shown on the provider's product page at collection time",
    availability: "UNKNOWN",
    sourceUrl,
    source: "price-grid-table",
  };
}
