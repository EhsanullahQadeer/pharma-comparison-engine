import type { PriceScrapeCadence } from "@/generated/prisma/client";

// A pharmacy staff can attach a manually entered offer to (picker on a variant's prices page).
export type OfferProviderOption = {
  id: string;
  tradingName: string;
  websiteDomain: string;
};

// One selected row in a bulk price action toolbar — a price (offer), the product page tracking it
// (match), or both. Actions skip rows missing what they act on.
export type BulkPriceRow = {
  offerId: string | null;
  matchId: string | null;
  published: boolean;
  providerPublished: boolean;
};

// Schedule state across every confirmed product page of one catalogue variant (Product variants
// list). `cadence` is null when nothing is tracked yet, "MIXED" when the pages disagree.
export type VariantScheduleSummary = {
  tracked: number;
  cadence: PriceScrapeCadence | "MIXED" | null;
  nextScrapeAt: Date | null;
};

// One purchasable option a shop's embedded page data names (product, chosen options, full label)
// with its price — what the Next.js/Shopify variant readers check against a catalogue variant.
export type PricedVariantLabel = {
  productName: string;
  optionText: string;
  label: string;
  itemPricePence: number;
  availability: "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";
};
