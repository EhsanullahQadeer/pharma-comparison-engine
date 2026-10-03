import { decodeHtmlText, htmlTextItems } from "@/lib/price-collection/html-text";
import type { ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { brandSideMatches, labelMatchesVariant, otcProductMismatch, type VariantSpec } from "@/lib/price-collection/variant-label";

// Prices laid out as one block per pack size (e.g. Your Pharmacy's Elementor pages): a heading
// "Pack Size – 4 tablets", then a tab per strength ("25mg", "50mg", "100mg") and, in the same
// order, each strength's price ("£24.95", "£29.95", "£33.50"). A block counts only when its
// strengths and prices pair up one to one — strengths first, then exactly as many prices. The
// page's own heading names the product and decides branded vs generic.

const PACK_HEADING = /^pack\s*size\s*[–—-]\s*(\d{1,3})\s*(?:tablets?|capsules?)$/i;
const STRENGTH = /^\d{1,3}(?:\.\d+)?\s*mg$/i;
const PRICE = /^£\s*(\d+(?:\.\d{1,2})?)$/;

type Block = { pack: string; strengths: string[]; prices: string[]; valid: boolean };

// Each pack heading starts a block that collects strengths, then prices; any price before a
// strength, or a strength after a price, means the block isn't this layout and it is dropped.
function packBlocks(items: string[]): Block[] {
  const blocks: Block[] = [];
  let open: Block | undefined;
  for (const item of items) {
    const pack = item.match(PACK_HEADING)?.[1];
    const price = item.match(PRICE)?.[1];
    if (pack) {
      open = { pack, strengths: [], prices: [], valid: true };
      blocks.push(open);
    } else if (open && STRENGTH.test(item)) {
      if (open.prices.length > 0) open.valid = false;
      open.strengths.push(item);
    } else if (open && price) {
      if (open.strengths.length === 0) open.valid = false;
      open.prices.push(price);
      // The block is complete once every strength has its price.
      if (open.prices.length === open.strengths.length) open = undefined;
    }
  }
  return blocks.filter((block) => block.valid && block.strengths.length > 0 && block.strengths.length === block.prices.length);
}

export function pickPackBlockPrice(html: string, matchedTokens: string[], variant: VariantSpec, sourceUrl: string): ScrapedPrice | undefined {
  const name = decodeHtmlText((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "").replace(/<[^>]+>/g, " "));
  const token = matchedTokens.find((candidate) => name.toLowerCase().includes(candidate.toLowerCase()));
  if (!token || otcProductMismatch(name, matchedTokens) || !brandSideMatches(name, "", matchedTokens[0], variant.generic)) return undefined;

  const matches: { itemPricePence: number; evidence: string }[] = [];
  for (const block of packBlocks(htmlTextItems(html))) {
    block.strengths.forEach((strength, index) => {
      if (!labelMatchesVariant(`${token} ${strength} ${block.pack} tablets`, matchedTokens, variant)) return;
      matches.push({ itemPricePence: Math.round(Number(block.prices[index]) * 100), evidence: `${name}: ${strength} × ${block.pack} tablets` });
    });
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
