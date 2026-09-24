import type { DiscoveryCadence, DiscoveryCandidateStatus, DiscoveryRunStatus, DiscoverySourceType } from "@/generated/prisma/client";
import type { EdFilterAudit } from "@/types/discovery";

export const discoverySourceTypeLabels: Record<DiscoverySourceType, string> = {
  MANUAL_WEB: "Staff-submitted websites",
  COMPANIES_HOUSE: "Companies House",
  CQC: "CQC",
  NHS_ODS: "NHS ODS",
  NHSBSA_CONTRACTOR_DETAILS: "NHSBSA Contractor Details",
  GPHC: "GPhC",
};

export const discoveryCadenceLabels: Record<DiscoveryCadence, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
};

export const discoveryRunStatusLabels: Record<DiscoveryRunStatus, string> = {
  SUCCESS: "Success",
  FAILURE: "Failure",
  PARTIAL: "Partial",
};

export const discoveryRunStatusBadgeVariant: Record<DiscoveryRunStatus, "secondary" | "default" | "outline" | "destructive"> = {
  SUCCESS: "default",
  FAILURE: "destructive",
  PARTIAL: "outline",
};

export const discoveryCandidateStatusLabels: Record<DiscoveryCandidateStatus, string> = {
  NEW: "New",
  LINKED_EXISTING: "Possible match",
  PROMOTED: "Promoted",
  REJECTED: "Rejected",
};

// Once a candidate has been reviewed, LINKED_EXISTING means staff confirmed the link rather than
// "possible match", so the history tabs on the Reviews page label it differently.
export const reviewedDiscoveryCandidateStatusLabels: Record<DiscoveryCandidateStatus, string> = {
  ...discoveryCandidateStatusLabels,
  LINKED_EXISTING: "Linked",
};

export const discoveryCandidateStatusBadgeVariant: Record<DiscoveryCandidateStatus, "secondary" | "default" | "outline" | "destructive"> = {
  NEW: "secondary",
  LINKED_EXISTING: "outline",
  PROMOTED: "default",
  REJECTED: "destructive",
};

// Plain literal, not a value-import of the generated Prisma client — that pulls Node-only driver
// adapter code into client bundles (see the same note in provider-labels.ts). Keep in sync with
// the DiscoveryCadence enum.
export const discoveryCadenceValues = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"] as const satisfies readonly DiscoveryCadence[];

// Reads a candidate's rawPayload.edFilterAudit defensively — rawPayload is unstructured JSON with
// no schema guarantee, so this never assumes the shape is present or well-formed.
export function readEdFilterAudit(rawPayload: unknown): EdFilterAudit | undefined {
  if (!rawPayload || typeof rawPayload !== "object") return undefined;
  const audit = (rawPayload as Record<string, unknown>).edFilterAudit;
  if (!audit || typeof audit !== "object") return undefined;
  const outcome = (audit as Record<string, unknown>).outcome;
  if (outcome !== "BLOCKED" && outcome !== "NEEDS_GPHC") return undefined;
  return audit as EdFilterAudit;
}
