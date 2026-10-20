import { recordGridLayoutView } from "@/actions/analytics/layout-test";
import { checkCandidateForEdMedicine } from "@/actions/discovery/discovery-candidates";
import { checkProviderSiteOffers, reviewDeliveryPolicy, reviewScrapedDiscount } from "@/actions/price-collection/site-offers";
import { scrapePricesForVariant } from "@/actions/product-variants/product-variants";

export const mutationRegistry = { scrapePricesForVariant, checkCandidateForEdMedicine, checkProviderSiteOffers, reviewDeliveryPolicy, reviewScrapedDiscount, recordGridLayoutView };
export type MutationKey = keyof typeof mutationRegistry;
