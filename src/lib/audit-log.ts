import type { AuditAction, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type AuditEntityType =
  | "Provider"
  | "ProductVariant"
  | "Offer"
  | "Discount"
  | "Evidence"
  | "Article"
  | "Correction"
  | "Referral"
  | "StaffUser"
  | "DiscoverySource"
  | "DiscoveryCandidate";

type RecordAuditLogInput = {
  actorId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  changes?: Prisma.InputJsonValue;
};

// Fire-and-record write for the generic "who changed what, when" trail (see AuditLog in
// schema.prisma) — call this alongside a mutation, not instead of it; it never runs inside the
// mutation's own $transaction since a failed audit write must not roll back the real change.
export async function recordAuditLog({ actorId, action, entityType, entityId, changes }: RecordAuditLogInput) {
  await prisma.auditLog.create({
    data: { actorId, action, entityType, entityId, changes },
  });
}
