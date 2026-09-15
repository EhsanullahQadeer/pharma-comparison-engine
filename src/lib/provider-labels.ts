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
