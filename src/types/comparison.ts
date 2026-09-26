import type { Availability, Ingredient, PurchaseModel, RegulatorType } from "@/generated/prisma/client";

// Roadmap §4.5 freshness: "fresh" is ranked, "stale" is shown outside the ranking with a
// may-have-changed label, "expired" is never shown publicly (history is kept internally).
export type FreshnessTier = "fresh" | "stale" | "expired";

export type ComparisonSort = "tablet" | "total";

export type ComparisonFilters = {
  ingredient?: Ingredient;
  strengthMg?: number;
  packQuantity?: number;
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

// A published offer from a PUBLISHED provider, with totals and freshness already derived.
export type PublicOffer = {
  id: string;
  providerId: string;
  providerName: string;
  providerSlug: string;
  providerDomain: string;
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
};

export type PublicProviderSummary = {
  id: string;
  slug: string;
  name: string;
  legalName: string;
  websiteDomain: string;
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
