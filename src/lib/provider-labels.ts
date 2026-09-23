import type { ProviderStatus, RegulatorType } from "@/generated/prisma/client";

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

// Plain literal, not a value-import of the generated Prisma client — that pulls Node-only driver
// adapter code into client bundles (Turbopack: "chunking context does not support external
// modules (request: node:module)"). Keep this list in sync with the RegulatorType enum.
export const regulatorTypeValues = ["GPHC", "PSNI"] as const satisfies readonly RegulatorType[];

// Shared by ProviderForm's multi-select and the discovery-review table's inline region editor —
// Provider.serviceRegions is a free-text string[] in the schema, but these four are the only
// regions the business actually serves; either UI still preserves a legacy free-text value already
// saved on a provider even though it's not offered as a fresh option.
export const serviceRegionOptions = ["England", "Scotland", "Wales", "Northern Ireland"] as const;
