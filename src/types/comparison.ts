import type { Availability, DiscountValueType, Ingredient, InspectionOutcome, PaymentMethod, PurchaseModel, RegulatorType } from "@/generated/prisma/client";

// Freshness: "fresh" was checked in the last 24 hours; "stale" is older and carries a
// may-have-changed label. Both are shown and ranked.
export type FreshnessTier = "fresh" | "stale";

export type ComparisonSort = "tablet" | "total";

export type ComparisonFilters = {
  ingredient?: Ingredient;
  // Slug of variantTypeLabel ("viagra", "viagra-connect", "cialis", "generic").
  productType?: string;
  strengthMg?: number;
  // Slug of the base formulation, qualifiers dropped ("film-coated-tablet", "orodispersible-tablet").
  formulation?: string;
  packQuantity?: number;
  purchaseModel?: PurchaseModel;
  sort: ComparisonSort;
  // Grid view (the default) — see PriceGridOptions. "list" is the "All prices" table.
  view?: ComparisonView;
  // pack=any (per-tablet grid only).
  anyPack?: boolean;
  mode?: GridPriceMode;
  // true = "Medicine only": prices without delivery and other fees.
  medicineOnly?: boolean;
  column?: number;
  query?: string;
  codes?: boolean;
  // Forces a phone layout (previewing either A/B variant); unset = the configured default.
  layout?: PhoneGridLayout;
  // One of serviceRegionOptions ("Delivers to my area").
  region?: string;
  payment?: PaymentMethod;
  // Minimum Trustpilot score × 10 (only applied while scores are shown).
  minTrustpilot?: number;
} & GridFilterFlags;

export type ComparisonView = "grid" | "list";

// The two phone (under 640px) layouts of the grid being A/B tested: A "compact" (every column,
// rows expand) and B "swipe" (two columns per screen, snapping).
export type PhoneGridLayout = "compact" | "swipe";

// One choice in a comparison filter dropdown: a link to the page with that choice applied.
export type FilterOption = { label: string; href: string; active: boolean };
export type FilterOptionGroup = { label?: string; options: FilterOption[] };

export type PublicVariant = {
  id: string;
  ingredient: Ingredient;
  brandName: string | null;
  strengthMg: number;
  formulation: string;
  packQuantity: number;
};

// A staff-entered or staff-approved, unexpired discount on a published offer. Never estimated or
// inferred — if a pharmacy has none recorded, the public site says so rather than implying one exists.
export type PublicDiscount = {
  id: string;
  eligibility: string;
  code: string | null;
  valueType: DiscountValueType;
  valuePence: number | null;
  valuePercent: number | null;
  stackable: boolean;
  expiresAt: Date | null;
};

// A published offer from a PUBLISHED provider, with totals and freshness already derived.
export type PublicOffer = {
  id: string;
  providerId: string;
  providerName: string;
  providerSlug: string;
  providerDomain: string;
  providerLogoUrl: string | null;
  // The pharmacy's registration, so a shopper can check it on the regulator's own register.
  providerRegulatorType: RegulatorType;
  providerRegulatorReference: string;
  // Set when another pharmacy dispenses for this one (explains a shared registration number).
  providerDispensingPartnerName: string | null;
  providerFacts: PublicProviderFacts;
  variant: PublicVariant;
  itemPricePence: number;
  deliveryFeePence: number;
  consultationFeePence: number;
  otherMandatoryFeesPence: number;
  deliveredTotalPence: number;
  perTabletPence: number;
  // False until staff have verified the fees — the total is then indicative and never outranks a
  // verified total (milestone 05 independence rule).
  feesVerified: boolean;
  availability: Availability;
  purchaseModel: PurchaseModel;
  sourceUrl: string;
  checkedAt: Date;
  freshness: FreshnessTier;
  discounts: PublicDiscount[];
  // The delivered total after the single best approved, unexpired discount (taken off the medicine
  // price only), or null when there is none. Never used for ranking unless a shopper asks for it.
  discountedTotalPence: number | null;
  codeDiscountId: string | null;
  // Medicine + delivery against the previous recorded check: negative = fallen. Null when unchanged
  // or there is no earlier check.
  priceChangePence: number | null;
  // At its lowest of the last 30 days, having been higher within them.
  thirtyDayLow: boolean;
};

export type PublicProviderSummary = {
  id: string;
  slug: string;
  name: string;
  legalName: string;
  websiteDomain: string;
  logoUrl: string | null;
  regulatorType: RegulatorType;
  regulatorReference: string;
  serviceRegions: string[];
  evidenceCheckedAt: Date | null;
  offerCount: number;
  lowestPerTabletPence: number | null;
};

export type PublicProviderEvidence = {
  id: string;
  sourceUrl: string;
  checkedAt: Date | null;
};

export type PublicProviderProfile = PublicProviderSummary & {
  dispensingPartnerName: string | null;
  evidence: PublicProviderEvidence[];
  offers: PublicOffer[];
};

// Lowest/highest prices for one catalogue variant across every pharmacy that lists it.
export type VariantPriceSummary = {
  variant: PublicVariant;
  offerCount: number;
  lowestTotalPence: number;
  highestTotalPence: number;
  lowestPerTabletPence: number;
};

// A product shoppers recognise by name (a brand, or the unbranded generic of one ingredient), with
// its own public price page at /ed/prices/<slug>.
export type EdProduct = {
  slug: string;
  name: string;
  ingredient: Ingredient;
  // Matches variantTypeSlug ("viagra", "viagra-connect", "cialis", "cialis-together", "generic").
  typeSlug: string;
  // Prescription-only products keep the prescription-price search gate (src/lib/seo.ts); pharmacy
  // medicines sold without a prescription do not.
  prescriptionOnly: boolean;
  description: string;
  legalNote: string;
};

// Price grid (/ed/compare default view and the product price pages): one row per pharmacy, one
// column per strength — or per pack size for a single-strength product — for one product at a time.
export type GridPriceMode = "total" | "tablet";
// "any" (per-tablet mode only): each cell is the pharmacy's lowest per-tablet price for that
// strength, whatever the pack.
export type GridPack = number | "any";
export type GridColumnAxis = "strength" | "pack";

export type PriceGridOptions = {
  pack?: GridPack;
  mode: GridPriceMode;
  // false = "medicine only": the item price without delivery or other fees.
  fees: boolean;
  // Column (strength in mg, or pack size) to rank by; defaults to the column with the most prices.
  column?: number;
  // Pharmacy name search.
  query?: string;
  // "With code": prices after the best approved discount, ranked by that price.
  codes?: boolean;
};

// Shopper-facing facts staff have recorded for a pharmacy. Null = not recorded (shown as unknown,
// never as "no"). The Trustpilot score is null unless scores are switched on (SHOW_TRUSTPILOT_SCORES).
export type PublicProviderFacts = {
  serviceRegions: string[];
  nextDayDelivery: boolean | null;
  discreetPackaging: boolean | null;
  paymentMethods: PaymentMethod[];
  inspectionOutcome: InspectionOutcome | null;
  inspectionDate: Date | null;
  trustpilotUrl: string | null;
  trustpilotScoreTenths: number | null;
  trustpilotReviewCount: number | null;
};

// The grid's filters drawer (and the quick chips above the grid).
export type GridFilterFlags = {
  nextDay?: boolean;
  discreet?: boolean;
  inspectionPassed?: boolean;
  inStock?: boolean;
  freeDelivery?: boolean;
  noConsultation?: boolean;
  verifiedOnly?: boolean;
  hasDiscount?: boolean;
};

export type GridCell =
  | { kind: "price"; offer: PublicOffer; valuePence: number; lowest: boolean }
  | { kind: "out-of-stock"; offer: PublicOffer }
  | { kind: "not-sold" };

export type PriceGridRow = {
  providerId: string;
  providerName: string;
  providerSlug: string;
  providerLogoUrl: string | null;
  providerRegulatorType: RegulatorType;
  providerRegulatorReference: string;
  providerDispensingPartnerName: string | null;
  providerFacts: PublicProviderFacts;
  // Most recent check across this row's cells.
  checkedAt: Date;
  freshness: FreshnessTier;
  // Recorded discounts across this row's offers, de-duplicated.
  discounts: PublicDiscount[];
  // One per column, in column order.
  cells: GridCell[];
};

export type PriceGridColumnSummary = {
  column: number;
  // Null when no pharmacy has an in-stock price in this column.
  lowestPence: number | null;
  medianPence: number | null;
  highestPence: number | null;
  pharmacyCount: number;
};

export type PriceGrid = {
  axis: GridColumnAxis;
  columns: number[];
  // Pack sizes on offer for the product (strength axis only; empty on the pack axis).
  packs: number[];
  // The pack in force after defaults/fallbacks ("any" only in per-tablet mode).
  pack: GridPack | null;
  mode: GridPriceMode;
  fees: boolean;
  codes: boolean;
  sortColumn: number | null;
  rows: PriceGridRow[];
  summaries: PriceGridColumnSummary[];
  // Latest check of any price in the grid: the page-level "Prices last checked".
  latestCheckedAt: Date | null;
};

// One offer's recorded checks, summarised in the database for the price-movement labels.
export type PriceHistoryAggregate = {
  // Medicine + delivery, newest first; at most the two latest checks.
  recentPence: number[];
  // Lowest and highest over the last 30 days, null when there is no check in that window.
  low30Pence: number | null;
  high30Pence: number | null;
};

// One day's price for an offer (medicine + delivery, the last check that day), for sparklines.
export type PricePoint = { day: Date; pence: number };
