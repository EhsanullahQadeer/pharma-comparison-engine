import type { DiscoverySourceType } from "@/generated/prisma/client";

// Which credential fields each source needs, driving both the create/edit form's inputs and what
// the write actions merge into the encrypted blob. Plain string-literal object, not built from the
// generated enum's runtime values — safe to import from client components (see the same note in
// provider-labels.ts/discovery-labels.ts: importing the Prisma client's enum object into a client
// bundle pulls in Node-only driver code and breaks Turbopack).
export const discoverySourceCredentialFields: Record<DiscoverySourceType, { key: string; label: string }[]> = {
  COMPANIES_HOUSE: [{ key: "apiKey", label: "API key" }],
  CQC: [
    { key: "subscriptionKey", label: "Subscription key (primary or secondary)" },
  ],
  NHS_ODS: [],
  GPHC: [],
  NHSBSA_CONTRACTOR_DETAILS: [],
};
