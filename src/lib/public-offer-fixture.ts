import type { PublicOffer } from "@/types/comparison";

// Test support: a complete published offer (in stock, fees verified, checked an hour before `now`)
// with only the fields a test cares about overridden. Totals follow the price parts unless given.
export function publicOffer(overrides: Partial<PublicOffer> & { id: string; providerId: string }, now = new Date("2026-10-22T12:00:00Z")): PublicOffer {
  const itemPricePence = overrides.itemPricePence ?? 2000;
  const deliveryFeePence = overrides.deliveryFeePence ?? 0;
  const variant = overrides.variant ?? { id: "v-50-4", ingredient: "SILDENAFIL", brandName: null, strengthMg: 50, formulation: "Film-coated tablet (generic)", packQuantity: 4 };
  const deliveredTotalPence = overrides.deliveredTotalPence ?? itemPricePence + deliveryFeePence;
  return {
    providerName: `Pharmacy ${overrides.providerId}`,
    providerSlug: overrides.providerId,
    providerDomain: `${overrides.providerId}.co.uk`,
    providerLogoUrl: null,
    providerRegulatorType: "GPHC",
    providerRegulatorReference: "9010001",
    providerDispensingPartnerName: null,
    providerFacts: { serviceRegions: [], nextDayDelivery: null, discreetPackaging: null, paymentMethods: [], inspectionOutcome: null, inspectionDate: null, trustpilotUrl: null, trustpilotScoreTenths: null, trustpilotReviewCount: null },
    variant,
    itemPricePence,
    wasPricePence: null,
    deliveryFeePence,
    consultationFeePence: 0,
    otherMandatoryFeesPence: 0,
    deliveredTotalPence,
    perTabletPence: Math.round(deliveredTotalPence / variant.packQuantity),
    feesVerified: true,
    availability: "IN_STOCK",
    purchaseModel: "ONE_OFF",
    billingPeriodDays: null,
    sourceUrl: `https://${overrides.providerId}.co.uk/p`,
    checkedAt: new Date(now.getTime() - 60 * 60 * 1000),
    freshness: "fresh",
    discounts: [],
    discountedTotalPence: null,
    codeDiscountId: null,
    priceChangePence: null,
    thirtyDayLow: false,
    ...overrides,
  };
}
