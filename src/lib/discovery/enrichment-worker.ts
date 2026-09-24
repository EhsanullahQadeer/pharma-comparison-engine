import type { NormalizedCandidate } from "@/types/discovery";

export type DiscoveryEnrichmentWorker = "GOOGLE_AI_MODE" | "DEEPSEEK_WEB";

// Uses permanent source data, so retries and reordered source responses cannot assign a pharmacy
// to both workers.
export function assignedEnrichmentWorker(sourceId: string, candidate: NormalizedCandidate): DiscoveryEnrichmentWorker {
  let hash = 0;
  for (const character of `${sourceId}:${candidate.sourceRecordId}`) hash = ((hash * 31) + character.charCodeAt(0)) >>> 0;
  return hash % 2 === 0 ? "GOOGLE_AI_MODE" : "DEEPSEEK_WEB";
}
