import type { Availability, DiscountValueType, Ingredient, ProductCategory, PurchaseModel, SupplyClassification } from "@/generated/prisma/client";

// Platform pivot (2026-09-16, docs/milestones/00-platform-strategy.md): ED is vertical #1,
// weight-loss vertical #2. Extend this list, never branch product logic on ingredient name alone.
export const productCategoryLabels: Record<ProductCategory, string> = {
  ERECTILE_DYSFUNCTION: "Erectile dysfunction",
  WEIGHT_LOSS: "Weight loss",
};

export const productCategoryValues = ["ERECTILE_DYSFUNCTION", "WEIGHT_LOSS"] as const satisfies readonly ProductCategory[];

export const ingredientLabels: Record<Ingredient, string> = {
  SILDENAFIL: "Sildenafil",
  TADALAFIL: "Tadalafil",
  TIRZEPATIDE: "Tirzepatide",
  SEMAGLUTIDE: "Semaglutide",
};

// Plain literal, not a value-import of the generated Prisma client — keeps Node-only driver
// adapter code out of client bundles (see the same note in provider-labels.ts).
export const ingredientValues = ["SILDENAFIL", "TADALAFIL", "TIRZEPATIDE", "SEMAGLUTIDE"] as const satisfies readonly Ingredient[];

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
