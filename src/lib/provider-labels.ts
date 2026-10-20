import type { InspectionOutcome, PaymentMethod, ProviderStatus, RegulatorType } from "@/generated/prisma/client";

export const providerStatusLabels: Record<ProviderStatus, string> = {
  DISCOVERED: "Discovered",
  IDENTITY_VERIFIED: "Identity verified",
  ED_CATALOGUE_VERIFIED: "ED catalogue verified",
  PUBLISHED: "Published",
  TEMPORARILY_WITHHELD: "Temporarily withheld",
  ARCHIVED: "Archived",
};

export const providerStatusBadgeVariant: Record<ProviderStatus, "secondary" | "default" | "outline" | "destructive"> = {
  DISCOVERED: "secondary",
  IDENTITY_VERIFIED: "outline",
  ED_CATALOGUE_VERIFIED: "outline",
  PUBLISHED: "default",
  TEMPORARILY_WITHHELD: "destructive",
  ARCHIVED: "destructive",
};

export const regulatorTypeLabels: Record<RegulatorType, string> = {
  GPHC: "GPhC (Great Britain)",
  PSNI: "PSNI (Northern Ireland)",
};

export const regulatorShortLabels: Record<RegulatorType, string> = {
  GPHC: "GPhC",
  PSNI: "PSNI",
};

// Public registers a visitor can search to check a registration themselves.
export const regulatorRegisterUrls: Record<RegulatorType, string> = {
  GPHC: "https://www.pharmacyregulation.org/registers",
  PSNI: "https://www.psni.org.uk/",
};

// A pharmacy's own entry on its regulator's register. The PSNI register has no per-pharmacy URL,
// so it falls back to the register's search page.
export const regulatorEntryUrls: Record<RegulatorType, (reference: string) => string> = {
  GPHC: (reference) => `https://www.pharmacyregulation.org/registers/pharmacy/${encodeURIComponent(reference)}`,
  PSNI: () => regulatorRegisterUrls.PSNI,
};

export const inspectionOutcomeLabels: Record<InspectionOutcome, string> = {
  STANDARDS_MET: "Standards met",
  STANDARDS_NOT_ALL_MET: "Standards not all met",
  EXCELLENT: "Excellent",
  GOOD: "Good",
  SATISFACTORY: "Satisfactory",
  POOR: "Poor",
};

// Outcomes that count as passing the last GPhC inspection (the "Passed its last inspection" filter).
export const inspectionPassed: Record<InspectionOutcome, boolean> = {
  STANDARDS_MET: true,
  STANDARDS_NOT_ALL_MET: false,
  EXCELLENT: true,
  GOOD: true,
  SATISFACTORY: true,
  POOR: false,
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CARD: "Card",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
  PAYPAL: "PayPal",
  KLARNA: "Klarna",
};

// Plain literals (not value imports of the Prisma enums, which pull server code into client
// bundles). Keep in sync with InspectionOutcome and PaymentMethod.
export const inspectionOutcomeValues = ["STANDARDS_MET", "STANDARDS_NOT_ALL_MET", "EXCELLENT", "GOOD", "SATISFACTORY", "POOR"] as const satisfies readonly InspectionOutcome[];
export const paymentMethodValues = ["CARD", "APPLE_PAY", "GOOGLE_PAY", "PAYPAL", "KLARNA"] as const satisfies readonly PaymentMethod[];

// Plain literal, not a value-import of the generated Prisma client — that pulls Node-only driver
// adapter code into client bundles (Turbopack: "chunking context does not support external
// modules (request: node:module)"). Keep this list in sync with the RegulatorType enum.
export const regulatorTypeValues = ["GPHC", "PSNI"] as const satisfies readonly RegulatorType[];

// Shared by ProviderForm's multi-select and the discovery-review table's inline region editor —
// Provider.serviceRegions is a free-text string[] in the schema, but these four are the only
// regions the business actually serves; either UI still preserves a legacy free-text value already
// saved on a provider even though it's not offered as a fresh option.
export const serviceRegionOptions = ["England", "Scotland", "Wales", "Northern Ireland"] as const;
