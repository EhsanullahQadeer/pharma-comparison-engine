import type { ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { labelMatchesVariant, type VariantSpec } from "@/lib/price-collection/variant-label";
import type { FeedCandidate } from "@/lib/product-detection/site-feeds";

// First collection step for a variant scrape: a price the pharmacy's own merchant feed declares
// (collected by collectFeedCandidates, plain HTTP, no browser). Only used when the matching feed
// items agree on exactly one price — two differently priced items for the same strength and pack
// (e.g. branded and generic listed together) mean the feed can't settle it, so the scrape moves on
// to the product page instead of picking one.
export function pickFeedVariantPrice(candidates: FeedCandidate[], tokens: string[], variant: VariantSpec): ScrapedPrice | undefined {
  const matching = candidates.filter((candidate) => candidate.price && candidate.title && labelMatchesVariant(candidate.title, tokens, variant));
  const prices = new Set(matching.map((candidate) => candidate.price?.itemPricePence));
  if (prices.size !== 1) return undefined;

  const [item] = matching;
  if (!item.price) return undefined;
  const { itemPricePence, deliveryFeePence, availability } = item.price;
  return {
    itemPricePence,
    deliveryFeePence: deliveryFeePence ?? 0,
    deliveryAssumption: deliveryFeePence === undefined
      ? "No shipping price declared in the provider's product feed"
      : "Shipping price declared in the provider's product feed",
    availability,
    sourceUrl: item.url,
    evidence: item.title,
    source: "merchant-feed",
  };
}
