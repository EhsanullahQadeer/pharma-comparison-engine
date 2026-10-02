"use client";

import { useMemo } from "react";

import { SelectAllCheckbox } from "@/components/admin/bulk-action-bar";
import { DetectProductsBulkActions } from "@/components/admin/detect-products-bulk-actions";
import { DiscoveryCandidateHistoryActions, hasDiscoveryCandidateHistoryAction } from "@/components/admin/discovery-candidate-history-actions";
import { Badge } from "@/components/common/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/common/card";
import { Checkbox } from "@/components/common/checkbox";
import { EmptyState } from "@/components/common/empty-state";
import Pagination from "@/components/common/pagination";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import Link from "@/components/Link";
import type { DiscoveryCandidateStatus, DiscoverySourceType } from "@/generated/prisma/client";
import { useRowSelection } from "@/hooks/useRowSelection";
import { useTableView } from "@/hooks/useTableView";
import { identifierSummary } from "@/lib/discovery-identifier-summary";
import { discoveryCandidateStatusBadgeVariant, discoverySourceTypeLabels, reviewedDiscoveryCandidateStatusLabels } from "@/lib/discovery-labels";
import type { TableSorters } from "@/types/table";

type HistoryItem = {
  id: string;
  name: string;
  postcode: string | null;
  websiteDomain: string | null;
  companyNumber: string | null;
  cqcLocationId: string | null;
  odsCode: string | null;
  gphcNumber: string | null;
  status: DiscoveryCandidateStatus;
  reviewedAt: Date | null;
  source: { type: DiscoverySourceType };
  matchedProvider: { id: string; tradingName: string; _count: { productMatches: number } } | null;
  reviewedByStaff: { name: string } | null;
};

const sorters = {
  source: (item) => discoverySourceTypeLabels[item.source.type],
  name: (item) => item.name,
  website: (item) => item.websiteDomain,
  pharmacy: (item) => item.matchedProvider?.tradingName,
  products: (item) => item.matchedProvider?._count.productMatches,
  status: (item) => reviewedDiscoveryCandidateStatusLabels[item.status],
  reviewed: (item) => item.reviewedAt,
} satisfies TableSorters<HistoryItem>;

// View of candidates staff have already decided on — what was decided, when and by whom, with a
// link through to the resulting pharmacy. Promoted and rejected rows also get an action to change
// that decision (see DiscoveryCandidateHistoryActions).
export function DiscoveryCandidateHistoryTable({ title, items, emptyTitle }: { title: string; items: HistoryItem[]; emptyTitle: string }) {
  const view = useTableView(items, sorters);
  // Only rows that became (or were linked to) a pharmacy can have their products detected.
  const selectableIds = useMemo(() => items.filter((item) => item.matchedProvider && item.status !== "REJECTED").map((item) => item.id), [items]);
  const selection = useRowSelection(selectableIds);
  const canSelect = selectableIds.length > 0;
  // Several candidates can point at the same pharmacy; it is checked once.
  const selectedProviderIds = useMemo(
    () => [...new Set(items.flatMap((item) => (selection.selectedIds.includes(item.id) && item.matchedProvider ? item.matchedProvider.id : [])))],
    [items, selection.selectedIds],
  );
  const showActions = useMemo(() => items.some((item) => hasDiscoveryCandidateHistoryAction(item.status)), [items]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title} ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {items.length === 0 ? (
          <EmptyState title={emptyTitle} />
        ) : (
          <>
          {canSelect ? <DetectProductsBulkActions providerIds={selectedProviderIds} onClear={selection.clear} /> : null}
          <Table resizable={false}>
            <TableHeader>
              <TableRow>
                {canSelect ? (
                  <TableHead className="w-10">
                    <SelectAllCheckbox allSelected={selection.allSelected} someSelected={selection.someSelected} onToggleAll={selection.toggleAll} label="Select all pharmacies in this list" />
                  </TableHead>
                ) : null}
                <TableHead minWidth={170} {...view.sortProps("source")}>Source</TableHead>
                <TableHead minWidth={200} {...view.sortProps("name")}>Name</TableHead>
                <TableHead minWidth={180} {...view.sortProps("website")}>Website</TableHead>
                <TableHead minWidth={200}>Identifiers</TableHead>
                <TableHead minWidth={180} {...view.sortProps("pharmacy")}>Pharmacy</TableHead>
                <TableHead minWidth={130} {...view.sortProps("products")}>Products found</TableHead>
                <TableHead minWidth={110} {...view.sortProps("status")}>Status</TableHead>
                <TableHead minWidth={150} {...view.sortProps("reviewed")}>Reviewed</TableHead>
                {showActions ? <TableHead minWidth={170} className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.rows.map((item) => (
                <TableRow key={item.id} data-state={selection.isSelected(item.id) ? "selected" : undefined}>
                  {canSelect ? (
                    <TableCell>
                      {selectableIds.includes(item.id) ? (
                        <Checkbox checked={selection.isSelected(item.id)} onCheckedChange={(checked) => selection.toggle(item.id, checked === true)} aria-label={`Select ${item.name}`} />
                      ) : null}
                    </TableCell>
                  ) : null}
                  <TableCell className="text-muted-foreground">{discoverySourceTypeLabels[item.source.type]}</TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate font-medium">{item.name}</p>
                    {item.postcode ? <p className="text-xs text-muted-foreground">{item.postcode}</p> : null}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {item.websiteDomain ? (
                      <a href={`https://${item.websiteDomain}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {item.websiteDomain}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{identifierSummary(item)}</TableCell>
                  <TableCell>
                    {item.matchedProvider ? (
                      <Link href={`/admin/pharmacies/${item.matchedProvider.id}`} className="hover:underline">
                        {item.matchedProvider.tradingName}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{item.matchedProvider?._count.productMatches ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={discoveryCandidateStatusBadgeVariant[item.status]}>{reviewedDiscoveryCandidateStatusLabels[item.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <p>{item.reviewedAt ? new Date(item.reviewedAt).toLocaleString("en-GB") : "—"}</p>
                    {item.reviewedByStaff ? <p>by {item.reviewedByStaff.name}</p> : null}
                  </TableCell>
                  {showActions ? (
                    <TableCell className="text-right">
                      <DiscoveryCandidateHistoryActions candidateId={item.id} status={item.status} />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </>
        )}
      </CardContent>
      {items.length > 0 ? (
        <CardFooter className="border-t">
          <Pagination {...view.pagination} />
        </CardFooter>
      ) : null}
    </Card>
  );
}
