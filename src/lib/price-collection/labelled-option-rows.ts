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
// or as unlabelled rows under a column header (e.g. Medy's ED page, once drawn in a browser):
//   Cialis   GENERIC   DOSE  USAGE  QTY  PRICE
//   10mg  On-Demand  4  £34.40
//   5mg  DAILY  Daily  28  £62.50
// Each row belongs to the product name above it, which also decides branded vs generic (Medy tags
// every section "GENERIC", Viagra and Cialis included, so that tag is ignored); a name for a
// medicine we don't compare closes the section so its rows are never read as the previous one's.

const COMPARED_PRODUCT = /\b(?:viagra|sildenafil|cialis|tadalafil)\b/i;
const OTHER_PRODUCT = /\b(?:vardenafil|levitra|avanafil|spedra|eroxon|vitaros|alprostadil)\b/i;
const STRENGTH_LABEL = /^strength\s*:?$/i;
const QUANTITY_LABEL = /^(?:quantity|pack\s*size|tablets)\b[^£]*:?$/i;
const STRENGTH = /^\d{1,3}(?:\.\d+)?\s*mg$/i;
const COUNT = /^(\d{1,3})(?:\s*(?:tablets?|capsules?))?$/i;
const PRICE = /^£\s*(\d+(?:\.\d{1,2})?)$/;
const DOSE_COLUMN = /^dose$/i;
const QTY_COLUMN = /^(?:qty|quantity)$/i;
const PRICE_COLUMN = /^price$/i;
// A product name is a short standalone item ("Sildenafil", "Viagra Connect"), not a sentence.
const MAX_NAME_LENGTH = 40;
// How far after the strength its quantity label (or, in a column row, its count) may sit.
const ROW_LOOKAHEAD = 4;
// How far after "Dose" the "Qty" and "Price" column headings may sit.
const HEADER_SPAN = 4;

type OptionRow = { strength: string; count: string; price: string };

function isProductName(item: string) {
  return item.length <= MAX_NAME_LENGTH && !item.includes("£") && !item.endsWith(":") && !STRENGTH.test(item);
}

// "Strength:" <mg>, then "Quantity…:" <count> <£price> within the next few items.
function labelledRow(items: string[], index: number): OptionRow | undefined {
  const strength = items[index + 1];
  if (!STRENGTH_LABEL.test(items[index]) || !strength || !STRENGTH.test(strength)) return undefined;
  const quantityAt = items.slice(index + 2, index + 2 + ROW_LOOKAHEAD).findIndex((next) => QUANTITY_LABEL.test(next));
  if (quantityAt < 0) return undefined;
  const count = items[index + 2 + quantityAt + 1]?.match(COUNT)?.[1];
  const price = items[index + 2 + quantityAt + 2]?.match(PRICE)?.[1];
  return count && price ? { strength, count, price } : undefined;
}

// <mg>, any usage words ("DAILY", "On-Demand"), then <count> <£price>.
function columnRow(items: string[], index: number): OptionRow | undefined {
  const strength = items[index];
  if (!STRENGTH.test(strength)) return undefined;
  const countAt = items.slice(index + 1, index + 1 + ROW_LOOKAHEAD).findIndex((next) => COUNT.test(next) || PRICE.test(next) || STRENGTH.test(next));
  const count = items[index + 1 + countAt]?.match(COUNT)?.[1];
  const price = items[index + 2 + countAt]?.match(PRICE)?.[1];
  return countAt >= 0 && count && price ? { strength, count, price } : undefined;
}

function isColumnHeader(items: string[], index: number) {
  const next = items.slice(index + 1, index + 1 + HEADER_SPAN);
  return DOSE_COLUMN.test(items[index]) && next.some((item) => QTY_COLUMN.test(item)) && next.some((item) => PRICE_COLUMN.test(item));
}

export function pickLabelledOptionRowPrice(html: string, matchedTokens: string[], variant: VariantSpec, sourceUrl: string): ScrapedPrice | undefined {
  const items = htmlTextItems(html);
  const matches: { itemPricePence: number; evidence: string }[] = [];
  let product: string | undefined;
  // Unlabelled rows count only under a column header seen since the product name.
  let columns = false;
  items.forEach((item, index) => {
    if (isProductName(item) && (OTHER_PRODUCT.test(item) || COMPARED_PRODUCT.test(item))) {
      product = COMPARED_PRODUCT.test(item) && !OTHER_PRODUCT.test(item) ? item : undefined;
      columns = false;
    }
    if (isColumnHeader(items, index)) columns = true;
    const row = labelledRow(items, index) ?? (columns ? columnRow(items, index) : undefined);
    if (!product || !row) return;
    if (!brandSideMatches(product, "", matchedTokens[0], variant.generic)) return;
    if (!labelMatchesVariant(`${product} ${row.strength} ${row.count} tablets`, matchedTokens, variant)) return;
    matches.push({ itemPricePence: Math.round(Number(row.price) * 100), evidence: `${product}: ${row.strength} × ${row.count} tablets` });
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
