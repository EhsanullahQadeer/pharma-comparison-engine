import { scrapePricesForVariant } from "@/actions/product-variants/product-variants";

export const mutationRegistry = { scrapePricesForVariant };
export type MutationKey = keyof typeof mutationRegistry;
