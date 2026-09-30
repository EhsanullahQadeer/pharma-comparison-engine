import type { ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { brandSideMatches, labelMatchesVariant, type VariantSpec } from "@/lib/price-collection/variant-label";

// A "Prices" block laid out as one column per strength, each listing its packs as lines (e.g. Zava:
//   <div class="PriceTable-column"><strong class="PriceTable-columnTitle">25 mg</strong>
//     <p>4 tablet(s) - £12.99</p><p>8 tablet(s) - £17.00</p>…</div>
// Only this block is read — the same pages also carry cards for other products ("Generic
// sildenafil – 4 tablets £12.00") that must never be taken as the page's own price. The product's
// own heading decides branded vs generic ("Viagra" vs "Sildenafil tablets").

function text(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/&pound;|&#163;/gi, "£").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

const STRENGTH = /^(\d{1,3}(?:\.\d+)?)\s*mg$/i;
const PACK_LINE = /^(\d{1,3})\s*(?:tablet|capsule|pill)s?(?:\(s\))?\s*[-–:]\s*£\s*(\d+(?:\.\d{1,2})?)$/i;

export function pickPriceTableColumns(html: string, matchedTokens: string[], variant: VariantSpec, sourceUrl: string): ScrapedPrice | undefined {
  const name = text(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
  const token = matchedTokens.find((candidate) => name.toLowerCase().includes(candidate.toLowerCase()));
  if (!token || !brandSideMatches(name, "", matchedTokens[0], variant.generic)) return undefined;

  const matches: { itemPricePence: number; evidence: string }[] = [];
  // Each column: its strength title, then its pack lines up to where the column's content closes.
  const columns = html.split(/class="[^"]*\bPriceTable-columnTitle\b[^"]*"/i).slice(1).map((column) => column.split(/<\/div>\s*<\/div>/i)[0]);
  for (const column of columns) {
    const strength = text(column.match(/^[^>]*>([\s\S]*?)<\//)?.[1] ?? "");
    if (!STRENGTH.test(strength)) continue;
    for (const line of column.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
      const pack = text(line[1]).match(PACK_LINE);
      if (!pack) continue;
      const label = `${name} ${strength} ${pack[1]} tablets`;
      if (!labelMatchesVariant(label, matchedTokens, variant)) continue;
      matches.push({ itemPricePence: Math.round(Number(pack[2]) * 100), evidence: label });
    }
  }
  if (new Set(matches.map((match) => match.itemPricePence)).size !== 1) return undefined;
  return {
    ...matches[0],
    deliveryFeePence: 0,
    deliveryAssumption: "As shown on the provider's product page at collection time",
    availability: "UNKNOWN",
    sourceUrl,
    source: "price-table-columns",
  };
}
