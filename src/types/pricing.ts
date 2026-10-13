import type { DeliveryPolicy, Discount, DiscountValueType, PriceScrapeCadence } from "@/generated/prisma/client";

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

// One tracked product page in a bulk scrape. `providerId` lets a run stop sending a pharmacy's pages
// to the visible Chrome window once its security check has gone unanswered.
export type BulkScrapePage = { matchId: string; providerId?: string };

// How a bulk scrape reads each page: automatically, in the visible Chrome window, or automatically
// with the visible window as the last resort.
export type BulkScrapeMode = "automatic" | "human" | "automaticThenHuman";

export type BulkScrapeResult = { message?: string; error?: string };

// The one bulk scrape a browser tab runs at a time, kept outside any page so it survives moving
// around the admin. `scope` is the path of the page that started it; `ownerMounted` says whether
// that page's toolbar is on screen (it then shows the run itself, and the admin-wide strip hides).
export type BulkScrapeRun = {
  scope: string | null;
  running: boolean;
  progress: string | null;
  result: BulkScrapeResult | null;
  ownerMounted: boolean;
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

// A delivery charge read from a pharmacy's own website wording, awaiting staff approval.
export type DetectedDeliveryPolicy = {
  standardFeePence: number;
  freeOverPence: number | null;
  evidenceText: string;
};

// A discount offer read from a pharmacy's own website wording, awaiting staff approval.
export type DetectedDiscount = {
  code: string | null;
  valueType: DiscountValueType;
  valuePercent: number | null;
  valuePence: number | null;
  eligibility: string;
  evidenceText: string;
};

// What the website check found for one pharmacy, as shown on its admin page.
export type ProviderSiteOffers = {
  checkedAt: Date | null;
  deliveryPolicies: DeliveryPolicy[];
  discounts: Discount[];
};
