import type { DiscoveryCandidate } from "../../src/generated/prisma/client";

// The common projection all discovery-audit scripts write to their per-source JSON dumps: every
// resolved identifier field plus the untouched rawPayload, so a source's real output can be
// eyeballed without exposing internal-only columns (sourceId, reviewedByStaffId, lastSeenRunId).
export type DiscoveryCandidateAuditInput = Pick<
  DiscoveryCandidate,
  | "sourceRecordId"
  | "status"
  | "matchedProviderId"
  | "name"
  | "postcode"
  | "websiteDomain"
  | "companyNumber"
  | "cqcLocationId"
  | "odsCode"
  | "gphcNumber"
  | "discoveredAt"
  | "rawPayload"
>;

export function toCandidateAuditRecord(candidate: DiscoveryCandidateAuditInput) {
  return {
    sourceRecordId: candidate.sourceRecordId,
    status: candidate.status,
    matchedProviderId: candidate.matchedProviderId,
    name: candidate.name,
    postcode: candidate.postcode,
    websiteDomain: candidate.websiteDomain,
    companyNumber: candidate.companyNumber,
    cqcLocationId: candidate.cqcLocationId,
    odsCode: candidate.odsCode,
    gphcNumber: candidate.gphcNumber,
    discoveredAt: candidate.discoveredAt,
    rawPayload: candidate.rawPayload,
  };
}
