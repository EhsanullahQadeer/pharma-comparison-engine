"use server";

import { revalidatePath } from "next/cache";

import { recordAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/staff-auth";

export async function getPendingEvidence() {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR"]);
  return prisma.evidence.findMany({
    where: { approvedStatus: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { provider: { select: { tradingName: true } }, offer: { select: { id: true, providerId: true } } },
  });
}

export type ReviewEvidenceState = { error?: string };

export async function reviewEvidence(evidenceId: string, decision: "APPROVED" | "REJECTED"): Promise<ReviewEvidenceState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to review evidence." };
  }

  await prisma.evidence.update({
    where: { id: evidenceId },
    data: { approvedStatus: decision, reviewerId: staffUser.id, checkedAt: new Date() },
  });

  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "Evidence", entityId: evidenceId, changes: { approvedStatus: decision } });

  revalidatePath("/admin/reviews");
  return {};
}
