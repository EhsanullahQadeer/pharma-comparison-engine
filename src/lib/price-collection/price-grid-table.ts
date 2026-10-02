import type { ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { brandSideMatches, labelMatchesVariant, otcProductMismatch, type VariantSpec } from "@/lib/price-collection/variant-label";

// A strength × pack-size price table on the product page (e.g. Oxford Online Pharmacy's "Our
// Prices": strengths across the header, "4 tablets"/"8 tablets" rows, "-" where a pack isn't sold).
// Either orientation is read: strengths in the header and packs in the first column, or the reverse.
// Some sites (e.g. Somer Pharmacy's TablePress table) label the pack column "Quantity" with bare
// counts ("4", "8") and give prices as bare amounts ("29.99") — accepted only in that exact shape.
// The product's own heading (or, with no <h1>, its page title) decides branded vs generic and
// supplies the ingredient/brand token.

function cellText(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&pound;|&#163;|&#xa3;/gi, "£")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, "–")
    .replace(/\s+/g, " ")
    .trim();
}

const STRENGTH = /(\d{1,3}(?:\.\d+)?)\s*mg\b/i;
const PACK = /\b(\d{1,3})\s*(?:x\s*)?(?:tablets?|tabs?|pills?|capsules?)\b/i;
const PRICE = /£\s*(\d+(?:\.\d{1,2})?)|^(\d{1,4}\.\d{2})$/;
const BARE_COUNT = /^(\d{1,3})$/;
const PRODUCT_WORD = /\b(?:sildenafil|viagra|tadalafil|cialis|generic)\b/i;
const OTHER_MEDICINE = /\b(?:vardenafil|levitra|avanafil|spedra|eroxon|vitaros|alprostadil)\b/i;
const QUANTITY_HEADING = /\b(?:quantity|qty|pack(?:\s*size)?|tablets?|pills?|capsules?)\b/i;

// "Viagra – Somer Pharmacy" → "Viagra": the site-name suffix would otherwise sit in the name.
function productName(html: string) {
  const heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (heading) return cellText(heading);
  return cellText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").split(/\s+[–|-]\s+/)[0];
}

// A pack cell as a label labelMatchesVariant can read: "4 tablets" as-is, or a bare "4" when the
// column is headed "Quantity"/"Pack size".
function packLabel(cell: string, bareCountsAllowed: boolean) {
  if (PACK.test(cell)) return cell;
  const count = bareCountsAllowed ? cell.match(BARE_COUNT)?.[1] : undefined;
  return count ? `${count} tablets` : undefined;
}

export function pickPriceGridTable(html: string, matchedTokens: string[], variant: VariantSpec, sourceUrl: string): ScrapedPrice | undefined {
  const name = productName(html);
  const token = matchedTokens.find((candidate) => name.toLowerCase().includes(candidate.toLowerCase()));
  if (!token) return undefined;

  const matches: { itemPricePence: number; evidence: string }[] = [];
  for (const table of html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)) {
    const rows = [...table[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
      .map((row) => [...row[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cell) => cellText(cell[1])));
    if (rows.length < 2) continue;
    const [header, ...body] = rows;
    // Strengths across the top and packs down the side, or packs across the top and strengths down.
    // Bare pack counts down the side only when the first header cell names that column a quantity.
    const bareCounts = QUANTITY_HEADING.test(header[0] ?? "") && !STRENGTH.test(header[0] ?? "");
    const strengthsAcross = header.slice(1).some((cell) => STRENGTH.test(cell)) && body.some((row) => packLabel(row[0] ?? "", bareCounts));
    const packsAcross = header.slice(1).some((cell) => PACK.test(cell)) && body.some((row) => STRENGTH.test(row[0] ?? ""));
    if (!strengthsAcross && !packsAcross) continue;
    for (const row of body) {
      for (let column = 1; column < row.length; column += 1) {
        const priceMatch = row[column].match(PRICE);
        const price = priceMatch?.[1] ?? priceMatch?.[2];
        if (!price) continue;
        const strength = strengthsAcross ? header[column] : row[0];
        const pack = strengthsAcross ? packLabel(row[0], bareCounts) : header[column];
        if (!pack) continue;
        // A strength label that names its own product ("Generic Viagra 25mg" beside "Viagra 25mg",
        // or "Sildenafil 50mg" alternatives on a Viagra Connect page — Dr Fox) is that product, branded
        // or generic by its own wording; a bare strength ("25mg") is the page's product.
        // A row for a medicine we don't compare ("Vardenafil 5mg Tablets" in Cloud Pharmacy's
        // comparison table) is never the page's product.
        if (OTHER_MEDICINE.test(strength)) continue;
        const product = PRODUCT_WORD.test(strength) ? strength : name;
        // The label below only carries the matched token, so the product's full name is checked here:
        // a "Cialis Together" page's table is never prescription Cialis (Oxford Online Pharmacy).
        if (otcProductMismatch(product, matchedTokens)) continue;
        if (!brandSideMatches(product, "", matchedTokens[0], variant.generic)) continue;
        const label = product === strength ? `${strength} ${pack}` : `${token} ${strength} ${pack}`;
        if (!labelMatchesVariant(label, matchedTokens, variant)) continue;
        matches.push({ itemPricePence: Math.round(Number(price) * 100), evidence: `${name}: ${strength} × ${pack}` });
      }
    }
  }
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
