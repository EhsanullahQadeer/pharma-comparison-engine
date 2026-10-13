import type { ArticleStatus, PublicSubmissionKind, PublicSubmissionStatus } from "@/generated/prisma/client";

export const articleStatusLabels: Record<ArticleStatus, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "Draft",
  PUBLISHED: "Published",
};

export const articleStatusBadgeVariant: Record<ArticleStatus, "secondary" | "outline" | "default"> = {
  DRAFT: "secondary",
  IN_REVIEW: "secondary",
  PUBLISHED: "default",
};

export const publicSubmissionKindLabels: Record<PublicSubmissionKind, string> = {
  PHARMACY_SUGGESTION: "Pharmacy suggestion",
  CONTACT: "Contact message",
};

export const publicSubmissionStatusLabels: Record<PublicSubmissionStatus, string> = {
  NEW: "New",
  HANDLED: "Handled",
  SPAM: "Spam",
};

export const publicSubmissionStatusBadgeVariant: Record<PublicSubmissionStatus, "default" | "secondary" | "destructive"> = {
  NEW: "default",
  HANDLED: "secondary",
  SPAM: "destructive",
};

// Plain literals, not value-imports of the generated Prisma client (keeps it out of client bundles).
export const publicSubmissionKindValues = ["PHARMACY_SUGGESTION", "CONTACT"] as const satisfies readonly PublicSubmissionKind[];
export const publicSubmissionStatusValues = ["NEW", "HANDLED", "SPAM"] as const satisfies readonly PublicSubmissionStatus[];
