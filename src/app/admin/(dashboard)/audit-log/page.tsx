import { getAuditLog, getAuditLogEntityTypes } from "@/actions/audit-log/audit-log";
import { Badge } from "@/components/common/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import PaginationServer from "@/components/common/PaginationServer";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import { UrlSortTableHead } from "@/components/common/url-sort-table-head";
import Link from "@/components/Link";
import type { AuditAction } from "@/generated/prisma/client";
import { parsePageSize } from "@/lib/pagination";
import { parseSort } from "@/lib/table-sort";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Audit log", robots: { index: false, follow: false } };

const auditActionValues = ["CREATE", "UPDATE", "DELETE"] as const satisfies readonly AuditAction[];

const auditActionBadgeVariant: Record<AuditAction, "default" | "outline" | "destructive"> = {
  CREATE: "default",
  UPDATE: "outline",
  DELETE: "destructive",
};

export default async function AuditLogPage(props: PageProps<"/admin/audit-log">) {
  const { entityType, action, page: pageParam, pageSize: pageSizeParam, sort, order } = await props.searchParams;
  const entityTypeFilter = typeof entityType === "string" && entityType ? entityType : undefined;
  const actionFilter = typeof action === "string" && auditActionValues.includes(action as AuditAction) ? (action as AuditAction) : undefined;
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1;
  const pageSize = parsePageSize(typeof pageSizeParam === "string" ? pageSizeParam : undefined);

  const [{ entries, total, pages }, entityTypes] = await Promise.all([
    getAuditLog({ entityType: entityTypeFilter, action: actionFilter }, page, pageSize, parseSort(sort, order)),
    getAuditLogEntityTypes(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every create/update/delete recorded across the catalogue.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm text-muted-foreground">{total} entr{total === 1 ? "y" : "ies"}</CardTitle>
          <form action="/admin/audit-log" className="flex flex-wrap items-center gap-2">
            <select
              name="entityType"
              defaultValue={entityTypeFilter ?? ""}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="">All entity types</option>
              {entityTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select
              name="action"
              defaultValue={actionFilter ?? ""}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="">All actions</option>
              {auditActionValues.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <button type="submit" className="h-8 rounded-lg border border-input bg-transparent px-3 text-sm hover:bg-muted">Filter</button>
          </form>
        </CardHeader>
        <CardContent className="px-0">
          {entries.length === 0 ? (
            <EmptyState title="No audit entries match these filters." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <UrlSortTableHead sortKey="when">When</UrlSortTableHead>
                  <UrlSortTableHead sortKey="actor">Actor</UrlSortTableHead>
                  <UrlSortTableHead sortKey="action">Action</UrlSortTableHead>
                  <UrlSortTableHead sortKey="entity">Entity</UrlSortTableHead>
                  <TableHead>Changes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-muted-foreground">{new Date(entry.createdAt).toLocaleString("en-GB")}</TableCell>
                    <TableCell>{entry.actor?.name ?? "System"}</TableCell>
                    <TableCell>
                      <Badge variant={auditActionBadgeVariant[entry.action]}>{entry.action}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.entityType === "Provider" ? (
                        <Link href={`/admin/pharmacies/${entry.entityId}`} className="hover:underline">{entry.entityType}</Link>
                      ) : (
                        entry.entityType
                      )}
                      <span className="ml-1 font-mono text-xs">{entry.entityId.slice(0, 8)}</span>
                    </TableCell>
                    <TableCell>
                      {entry.changes ? (
                        <details>
                          <summary className="cursor-pointer text-xs text-primary">View</summary>
                          <pre className="mt-1 max-w-xs overflow-x-auto rounded-md bg-muted p-2 text-xs">{JSON.stringify(entry.changes, null, 2)}</pre>
                        </details>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <PaginationServer pages={pages} total={total} />
    </div>
  );
}
