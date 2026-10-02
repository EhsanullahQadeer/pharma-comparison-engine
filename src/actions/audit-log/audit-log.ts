"use server";

import { type AuditAction, type Prisma } from "@/generated/prisma/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/staff-auth";
import type { RequestedSort, SortOrder } from "@/types/table";

export type AuditLogFilters = { entityType?: string; action?: AuditAction };

// Columns the audit log can be sorted by (the `sort` search param), newest first by default.
const auditLogOrderBy: Record<string, (order: SortOrder) => Prisma.AuditLogOrderByWithRelationInput> = {
  when: (order) => ({ createdAt: order }),
  actor: (order) => ({ actor: { name: order } }),
  action: (order) => ({ action: order }),
  entity: (order) => ({ entityType: order }),
};

export async function getAuditLog(filters: AuditLogFilters, page = 1, pageSize: number = DEFAULT_PAGE_SIZE, sort?: RequestedSort) {
  await requireStaffRole(["ADMINISTRATOR"]);

  const where = {
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
    ...(filters.action ? { action: filters.action } : {}),
  };

  const requested = sort ? auditLogOrderBy[sort.sortBy] : undefined;

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      // Newest first breaks ties, so pages stay stable when many rows share a sorted value.
      orderBy: [...(requested ? [requested(sort?.sortOrder ?? "asc")] : []), { createdAt: "desc" }, { id: "asc" }],
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
