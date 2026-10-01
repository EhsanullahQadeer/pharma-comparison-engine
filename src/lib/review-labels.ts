import type { CorrectionStatus, EvidenceApprovalStatus, ScrapeReviewStatus } from "@/generated/prisma/client";

export const evidenceApprovalStatusLabels: Record<EvidenceApprovalStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const evidenceApprovalStatusBadgeVariant: Record<EvidenceApprovalStatus, "secondary" | "default" | "destructive"> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

export const correctionStatusLabels: Record<CorrectionStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  REJECTED: "Rejected",
};

export const correctionStatusValues = ["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"] as const satisfies readonly CorrectionStatus[];

export const correctionStatusBadgeVariant: Record<CorrectionStatus, "secondary" | "outline" | "default" | "destructive"> = {
  OPEN: "secondary",
  IN_PROGRESS: "outline",
  RESOLVED: "default",
  REJECTED: "destructive",
};

export const scrapeReviewStatusLabels: Record<ScrapeReviewStatus, string> = {
  PENDING: "Needs approval",
  APPROVED: "Approved",
  DISMISSED: "Dismissed",
};

export const scrapeReviewStatusBadgeVariant: Record<ScrapeReviewStatus, "secondary" | "default" | "outline"> = {
  PENDING: "secondary",
  APPROVED: "default",
  DISMISSED: "outline",
};
