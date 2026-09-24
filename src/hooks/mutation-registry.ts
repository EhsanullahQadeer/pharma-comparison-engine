import { checkCandidateForEdMedicine } from "@/actions/discovery/discovery-candidates";
import { scrapePricesForVariant } from "@/actions/product-variants/product-variants";

export const mutationRegistry = { scrapePricesForVariant, checkCandidateForEdMedicine };
export type MutationKey = keyof typeof mutationRegistry;
