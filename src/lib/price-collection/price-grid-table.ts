import type { ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { brandSideMatches, labelMatchesVariant, type VariantSpec } from "@/lib/price-collection/variant-label";

// A strength × pack-size price table on the product page (e.g. Oxford Online Pharmacy's "Our
// Prices": strengths across the header, "4 tablets"/"8 tablets" rows, "-" where a pack isn't sold).
// Either orientation is read: strengths in the header and packs in the first column, or the reverse.
// The product's own heading decides branded vs generic and supplies the ingredient/brand token.

function cellText(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&pound;|&#163;|&#xa3;/gi, "£")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const STRENGTH = /(\d{1,3}(?:\.\d+)?)\s*mg\b/i;
const PACK = /\b(\d{1,3})\s*(?:x\s*)?(?:tablets?|tabs?|pills?|capsules?)\b/i;
const PRICE = /£\s*(\d+(?:\.\d{1,2})?)/;

export function pickPriceGridTable(html: string, matchedTokens: string[], variant: VariantSpec, sourceUrl: string): ScrapedPrice | undefined {
  const name = cellText(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
  const token = matchedTokens.find((candidate) => name.toLowerCase().includes(candidate.toLowerCase()));
  if (!token || !brandSideMatches(name, "", matchedTokens[0], variant.generic)) return undefined;

  const matches: { itemPricePence: number; evidence: string }[] = [];
  for (const table of html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)) {
    const rows = [...table[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
      .map((row) => [...row[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cell) => cellText(cell[1])));
    if (rows.length < 2) continue;
    const [header, ...body] = rows;
    // Strengths across the top and packs down the side, or packs across the top and strengths down.
    const strengthsAcross = header.slice(1).some((cell) => STRENGTH.test(cell)) && body.some((row) => PACK.test(row[0] ?? ""));
    const packsAcross = header.slice(1).some((cell) => PACK.test(cell)) && body.some((row) => STRENGTH.test(row[0] ?? ""));
    if (!strengthsAcross && !packsAcross) continue;
    for (const row of body) {
      for (let column = 1; column < row.length; column += 1) {
        const price = row[column].match(PRICE)?.[1];
        if (!price) continue;
        const strength = strengthsAcross ? header[column] : row[0];
        const pack = strengthsAcross ? row[0] : header[column];
        const label = `${token} ${strength} ${pack}`;
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
