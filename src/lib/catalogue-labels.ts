import type { Availability, DiscountValueType, Ingredient, PriceScrapeCadence, PurchaseModel, SupplyClassification } from "@/generated/prisma/client";

export const ingredientLabels: Record<Ingredient, string> = {
  SILDENAFIL: "Sildenafil",
  TADALAFIL: "Tadalafil",
};

// Plain literal, not a value-import of the generated Prisma client — keeps Node-only driver
// adapter code out of client bundles (see the same note in provider-labels.ts).
export const ingredientValues = ["SILDENAFIL", "TADALAFIL"] as const satisfies readonly Ingredient[];

// URL segment / query value for each ingredient on the public pages (/ed/prices/sildenafil,
// /ed/compare?medicine=tadalafil).
export const ingredientSlugs: Record<Ingredient, string> = {
  SILDENAFIL: "sildenafil",
  TADALAFIL: "tadalafil",
};

export const supplyClassificationLabels: Record<SupplyClassification, string> = {
  POM: "Prescription only (POM)",
  P: "Pharmacy medicine (P)",
  GSL: "General sales list (GSL)",
};

export const supplyClassificationValues = ["POM", "P", "GSL"] as const satisfies readonly SupplyClassification[];

export const availabilityLabels: Record<Availability, string> = {
  IN_STOCK: "In stock",
  OUT_OF_STOCK: "Out of stock",
  UNKNOWN: "Unknown",
};

export const availabilityValues = ["IN_STOCK", "OUT_OF_STOCK", "UNKNOWN"] as const satisfies readonly Availability[];

export const availabilityBadgeVariant: Record<Availability, "default" | "destructive" | "secondary"> = {
  IN_STOCK: "default",
  OUT_OF_STOCK: "destructive",
  UNKNOWN: "secondary",
};

export const purchaseModelLabels: Record<PurchaseModel, string> = {
  ONE_OFF: "One-off",
  RECURRING: "Recurring",
};

export const purchaseModelValues = ["ONE_OFF", "RECURRING"] as const satisfies readonly PurchaseModel[];

export const discountValueTypeLabels: Record<DiscountValueType, string> = {
  PERCENT: "Percent",
  FIXED_AMOUNT: "Fixed amount",
};

export const discountValueTypeValues = ["PERCENT", "FIXED_AMOUNT"] as const satisfies readonly DiscountValueType[];

// Automatic price-refresh cadence for a tracked product page. MANUAL means "not scheduled".
export const priceScrapeCadenceLabels: Record<PriceScrapeCadence, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  MANUAL: "Off (manual only)",
};

export const priceScrapeCadenceValues = ["DAILY", "WEEKLY", "MONTHLY", "MANUAL"] as const satisfies readonly PriceScrapeCadence[];

// A match only refreshes automatically when scheduling is enabled; otherwise it's effectively manual.
export function effectivePriceCadence(match: { scrapeEnabled: boolean; scrapeCadence: PriceScrapeCadence }): PriceScrapeCadence {
  return match.scrapeEnabled ? match.scrapeCadence : "MANUAL";
}
