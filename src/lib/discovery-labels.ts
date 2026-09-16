import type { DiscoveryCadence, DiscoveryCandidateStatus, DiscoveryRunStatus, DiscoverySourceType } from "@/generated/prisma/client";

export const discoverySourceTypeLabels: Record<DiscoverySourceType, string> = {
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
