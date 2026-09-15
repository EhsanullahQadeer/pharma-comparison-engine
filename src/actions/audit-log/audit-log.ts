"use server";

import { type AuditAction } from "@/generated/prisma/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/staff-auth";

export type AuditLogFilters = { entityType?: string; action?: AuditAction };

export async function getAuditLog(filters: AuditLogFilters, page = 1, pageSize: number = DEFAULT_PAGE_SIZE) {
  await requireStaffRole(["ADMINISTRATOR"]);

  const where = {
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
    ...(filters.action ? { action: filters.action } : {}),
  };

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { entries, total, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getAuditLogEntityTypes() {
  await requireStaffRole(["ADMINISTRATOR"]);
  const rows = await prisma.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } });
  return rows.map((row) => row.entityType);
}
