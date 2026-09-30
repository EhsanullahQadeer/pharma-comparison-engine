import { brandSideMatches, labelMatchesVariant, type VariantSpec } from "@/lib/price-collection/variant-label";

// A rendered treatment list laid out as product sections whose rows don't repeat the product name
// (e.g. Rx Live Clinic's triage page, as its visible text):
//   Viagra® (Branded)
//   PDE5 Inhibitor — Branded · from £34.99 · QUANTITY / STRENGTH · BULK BUY · PRICE
//   25mg · 4 tablets (as needed)   1 tablet   £34.99
//   Sildenafil (Viagra®/Generic)
//   25mg · 4 tablets (as needed)   1 tablet   £14.99
// Each row belongs to the product title above it; a title for a medicine we don't compare
// (Vardenafil, Spedra) closes the section so its rows can't be read as the previous product's.

const COMPARED_PRODUCT = /\b(?:viagra|sildenafil|cialis|tadalafil)/i;
const OTHER_PRODUCT = /\b(?:vardenafil|levitra|avanafil|spedra|eroxon|vitaros)/i;
// "25mg · 4 tablets", "10mg as needed · 8 tablets", "50mg · 16 tablets": strength, then a count.
const ROW = /^\d{1,3}(?:\.\d+)?\s*mg\b.*?\b\d{1,3}\s*(?:tablets?|capsules?)\b/i;
const PRICE_LINE = /^£\s*(\d+(?:\.\d{1,2})?)$/;
// How far below a row its price may sit (the "1 tablet" bulk-buy column sits between them).
const PRICE_LOOKAHEAD = 3;

export function readSectionedTextPrice(text: string, matchedTokens: string[], variant: VariantSpec): { itemPricePence: number; evidence: string } | undefined {
  const lines = text.split("\n").map((line) => line.replace(/[®™]/g, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const matches: { itemPricePence: number; evidence: string }[] = [];
  let title: string | undefined;
  lines.forEach((line, index) => {
    const isRow = ROW.test(line);
    if (!isRow && !line.includes("£")) {
      if (OTHER_PRODUCT.test(line)) title = undefined;
      else if (COMPARED_PRODUCT.test(line)) title = line;
      return;
    }
    if (!isRow || !title) return;
    const price = lines.slice(index + 1, index + 1 + PRICE_LOOKAHEAD).map((next) => next.match(PRICE_LINE)?.[1]).find(Boolean);
    if (!price) return;
    // The section title names the product and its side; the row gives strength and count (a
    // strength in the title itself, "Viagra Connect 50mg", is left out so it can't disagree).
    if (!brandSideMatches(title, "", matchedTokens[0], variant.generic)) return;
    if (!labelMatchesVariant(`${title.replace(/\d{1,3}(?:\.\d+)?\s*mg\b/gi, "")} ${line}`, matchedTokens, variant)) return;
    matches.push({ itemPricePence: Math.round(Number(price) * 100), evidence: `${title}: ${line}` });
  });
  return new Set(matches.map((match) => match.itemPricePence)).size === 1 ? matches[0] : undefined;
}
