"use client";

import { useState, useTransition } from "react";

import { assignCorrectionToSelf, updateCorrectionStatus } from "@/actions/corrections/corrections";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import { TableViewPagination } from "@/components/common/table-view-pagination";
import Link from "@/components/Link";
import type { CorrectionStatus } from "@/generated/prisma/client";
import { useTableView } from "@/hooks/useTableView";
import { correctionStatusBadgeVariant, correctionStatusLabels, correctionStatusValues } from "@/lib/review-labels";
import type { TableSorters } from "@/types/table";

type CorrectionItem = {
  id: string;
  reportedIssue: string;
  reporterEmail: string | null;
  status: CorrectionStatus;
  providerId: string | null;
  provider: { tradingName: string } | null;
  assignedOwner: { name: string } | null;
};

const sorters = {
  issue: (item) => item.reportedIssue,
  provider: (item) => item.provider?.tradingName,
  owner: (item) => item.assignedOwner?.name,
  status: (item) => correctionStatusLabels[item.status],
} satisfies TableSorters<CorrectionItem>;

function CorrectionRow({ item }: { item: CorrectionItem }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleClaim() {
    setError(undefined);
    startTransition(async () => {
      const result = await assignCorrectionToSelf(item.id);
      if (result.error) setError(result.error);
    });
  }

  function handleStatusChange(status: CorrectionStatus) {
    setError(undefined);
    startTransition(async () => {
      const result = await updateCorrectionStatus(item.id, status);
      if (result.error) setError(result.error);
    });
  }

  return (
    <TableRow>
      <TableCell className="max-w-xs">
        <p className="truncate">{item.reportedIssue}</p>
        {item.reporterEmail ? <p className="text-xs text-muted-foreground">{item.reporterEmail}</p> : null}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {item.providerId ? <Link href={`/admin/pharmacies/${item.providerId}`} className="hover:underline">{item.provider?.tradingName ?? "—"}</Link> : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">{item.assignedOwner?.name ?? "Unassigned"}</TableCell>
      <TableCell>
        <Badge variant={correctionStatusBadgeVariant[item.status]}>{correctionStatusLabels[item.status]}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-wrap justify-end gap-1">
          {!item.assignedOwner && (
            <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={handleClaim}>Claim</Button>
          )}
          <select
            className="h-7 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            value={item.status}
            disabled={isPending}
            onChange={(event) => handleStatusChange(event.target.value as CorrectionStatus)}
          >
            {correctionStatusValues.map((value) => (
              <option key={value} value={value}>{correctionStatusLabels[value]}</option>
            ))}
          </select>
        </div>
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </TableCell>
    </TableRow>
  );
}

export function CorrectionReviewTable({ items }: { items: CorrectionItem[] }) {
  const view = useTableView(items, sorters);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Corrections ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {items.length === 0 ? (
          <EmptyState title="No corrections reported." />
        ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead {...view.sortProps("issue")}>Issue</TableHead>
                <TableHead {...view.sortProps("provider")}>Provider</TableHead>
                <TableHead {...view.sortProps("owner")}>Owner</TableHead>
                <TableHead {...view.sortProps("status")}>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.rows.map((item) => <CorrectionRow key={item.id} item={item} />)}
            </TableBody>
          </Table>
          <TableViewPagination pagination={view.pagination} className="px-(--card-spacing)" />
          </>
        )}
      </CardContent>
    </Card>
  );
}
