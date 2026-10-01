import type { Availability, DiscountValueType, Ingredient, PurchaseModel, RegulatorType } from "@/generated/prisma/client";

// Roadmap §4.5 freshness: "fresh" is ranked, "stale" is shown outside the ranking with a
// may-have-changed label, "expired" is never shown publicly (history is kept internally).
export type FreshnessTier = "fresh" | "stale" | "expired";

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
};

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
  freshness: Exclude<FreshnessTier, "expired">;
  discounts: PublicDiscount[];
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
