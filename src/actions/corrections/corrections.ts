"use server";

import { revalidatePath } from "next/cache";

import { type CorrectionStatus } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/staff-auth";

export async function getCorrections(status?: CorrectionStatus) {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR"]);
  return prisma.correction.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: { provider: { select: { tradingName: true } }, assignedOwner: { select: { name: true } } },
  });
}

export type CorrectionActionState = { error?: string };

// Self-assign — the reviewer working the queue claims a correction rather than picking from a
// staff-user list, keeping this a lightweight "claim and resolve" workflow.
export async function assignCorrectionToSelf(correctionId: string): Promise<CorrectionActionState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to work corrections." };
  }

  await prisma.correction.update({
    where: { id: correctionId },
    data: { assignedOwnerId: staffUser.id, status: "IN_PROGRESS" },
  });

  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "Correction", entityId: correctionId, changes: { assignedOwnerId: staffUser.id } });

  revalidatePath("/admin/reviews");
  return {};
}

export async function updateCorrectionStatus(correctionId: string, status: CorrectionStatus, resolution?: string): Promise<CorrectionActionState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to update corrections." };
  }

  await prisma.correction.update({
    where: { id: correctionId },
    data: { status, resolution: resolution?.trim() || undefined },
  });

  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "Correction", entityId: correctionId, changes: { status } });

  revalidatePath("/admin/reviews");
  return {};
}
