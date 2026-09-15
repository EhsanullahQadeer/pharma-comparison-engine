import type { Availability, DiscountValueType, Ingredient, PurchaseModel, SupplyClassification } from "@/generated/prisma/client";

export const ingredientLabels: Record<Ingredient, string> = {
  SILDENAFIL: "Sildenafil",
  TADALAFIL: "Tadalafil",
};

// Plain literal, not a value-import of the generated Prisma client — keeps Node-only driver
// adapter code out of client bundles (see the same note in provider-labels.ts).
export const ingredientValues = ["SILDENAFIL", "TADALAFIL"] as const satisfies readonly Ingredient[];

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
