import { extractEmbeddedJson } from "@/lib/price-collection/embedded-json";
import type { ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { brandSideMatches, labelMatchesVariant, type VariantSpec } from "@/lib/price-collection/variant-label";

// "The Ultimate Pharmacy" WordPress plugin (e.g. Rai's Pharmacy, Prime Med Pharmacy) renders its
// strength/quantity pickers as hidden radios and looks the price up client-side in an inline
// `const prices = [...]` list — one entry per strength + quantity. The visible text only ever shows
// the default pick, so the list itself is read. Only active (status "1"), one-off (no subscription
// days) entries count, and every entry matching the exact variant must agree on one price: the
// plugin can list the same strength + quantity twice at different prices, which is left unread.

type PluginPrice = {
  strength?: unknown;
  quantity?: unknown;
  price?: unknown;
  status?: unknown;
  subscription_days?: unknown;
};

function productName(html: string) {
  const heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return (heading ?? title ?? "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

export function pickPharmacyPluginPrice(html: string, matchedTokens: string[], variant: VariantSpec, sourceUrl: string): ScrapedPrice | undefined {
  const list = extractEmbeddedJson(html, /const\s+prices\s*=\s*\[/);
  if (!Array.isArray(list) || list.length === 0) return undefined;
  const name = productName(html);
  const nameToken = matchedTokens.find((token) => name.toLowerCase().includes(token.toLowerCase()));
  if (!nameToken) return undefined;

  const matches: { itemPricePence: number; evidence: string }[] = [];
  for (const entry of list as PluginPrice[]) {
    if (String(entry.status) !== "1" || Number(entry.subscription_days ?? 0) > 0) continue;
    if (typeof entry.strength !== "string" || typeof entry.quantity !== "string") continue;
    // Some entries give the pack as a bare number ("4") rather than "4 Tablets".
    const quantity = /^\d{1,3}$/.test(entry.quantity.trim()) ? `${entry.quantity.trim()} tablets` : entry.quantity;
    const optionsLabel = `${entry.strength} ${quantity}`;
    if (!brandSideMatches(name, optionsLabel, matchedTokens[0], variant.generic)) continue;
    if (!labelMatchesVariant(`${nameToken} ${optionsLabel}`, matchedTokens, variant)) continue;
    const price = Number(entry.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    matches.push({ itemPricePence: Math.round(price * 100), evidence: `${name}: ${optionsLabel}` });
  }
  if (new Set(matches.map((match) => match.itemPricePence)).size !== 1) return undefined;
  return {
    ...matches[0],
    deliveryFeePence: 0,
    deliveryAssumption: "As shown on the provider's product page at collection time",
    availability: "UNKNOWN",
    sourceUrl,
    source: "pharmacy-plugin-price-list",
  };
}
