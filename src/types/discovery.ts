import type { DiscoverySourceType, Prisma } from "@/generated/prisma/client";

// One normalized record ready to become/update a DiscoveryCandidate row. Every identifier field is
// optional because not every source surfaces every identifier type — identifier-match.ts checks
// whichever ones are present.
export type NormalizedCandidate = {
  sourceRecordId: string;
  name: string;
  postcode?: string;
  websiteDomain?: string;
  companyNumber?: string;
  cqcLocationId?: string;
  odsCode?: string;
  gphcNumber?: string;
  rawPayload: Prisma.InputJsonValue;
};

export type DiscoveryAdapterContext = {
  config: Prisma.JsonValue | null;
  // Null on a source's first-ever run. Adapters that support an incremental "since" filter (e.g.
  // Companies House's incorporated_from) use this to only pull what's new since the last run,
  // instead of re-fetching the same population every time — but treat null as "no baseline yet"
  // and do a full unfiltered scan rather than applying a lookback window, since most real-world
  // records (e.g. a pharmacy incorporated years ago) predate discovery ever running at all.
  lastRunAt: Date | null;
  // Decrypted credentials (see src/lib/discovery-credential-fields.ts for the shape per source),
  // or null if none are stored/decryptable — adapters fall back to an env var for local dev.
  credentials: Record<string, string> | null;
  // Optional — an adapter that makes a real request calls this once with its primary request's
  // method/URL/headers, secrets replaced with a "{name}" placeholder (never a real value), so
  // staff can see and manually reproduce exactly what was queried. Purely additive: an adapter
  // that never calls it just doesn't get a request summary recorded.
  recordRequest?: (summary: string) => void;
};

export type DiscoveryAdapter = {
  type: DiscoverySourceType;
  run(context: DiscoveryAdapterContext): Promise<NormalizedCandidate[]>;
};
