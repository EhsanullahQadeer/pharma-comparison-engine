import type { NormalizedCandidate } from "@/types/discovery";

export type DiscoveryEnrichmentWorker = "GOOGLE_AI_MODE" | "DEEPSEEK_WEB";

// DEEPSEEK_WEB_ENABLED=false pauses DeepSeek (e.g. while its account is suspended); every candidate
// then goes to Google AI. Removing the setting (or setting it to true) turns the split back on.
export function isDeepSeekEnabled() {
  return process.env.DEEPSEEK_WEB_ENABLED !== "false";
}

// Uses permanent source data, so retries and reordered source responses cannot assign a pharmacy
// to both workers.
export function assignedEnrichmentWorker(sourceId: string, candidate: NormalizedCandidate, deepSeekEnabled = isDeepSeekEnabled()): DiscoveryEnrichmentWorker {
  if (!deepSeekEnabled) return "GOOGLE_AI_MODE";
  let hash = 0;
  for (const character of `${sourceId}:${candidate.sourceRecordId}`) hash = ((hash * 31) + character.charCodeAt(0)) >>> 0;
  return hash % 2 === 0 ? "GOOGLE_AI_MODE" : "DEEPSEEK_WEB";
}
