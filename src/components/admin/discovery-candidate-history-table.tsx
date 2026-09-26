"use client";

import { useMemo, useState } from "react";

import { DiscoveryCandidateHistoryActions, hasDiscoveryCandidateHistoryAction } from "@/components/admin/discovery-candidate-history-actions";
import { Badge } from "@/components/common/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import Pagination from "@/components/common/pagination";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import Link from "@/components/Link";
import type { DiscoveryCandidateStatus, DiscoverySourceType } from "@/generated/prisma/client";
import { identifierSummary } from "@/lib/discovery-identifier-summary";
import { discoveryCandidateStatusBadgeVariant, discoverySourceTypeLabels, reviewedDiscoveryCandidateStatusLabels } from "@/lib/discovery-labels";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

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
  matchedProvider: { id: string; tradingName: string } | null;
  reviewedByStaff: { name: string } | null;
};

// View of candidates staff have already decided on — what was decided, when and by whom, with a
// link through to the resulting pharmacy. Promoted and rejected rows also get an action to change
// that decision (see DiscoveryCandidateHistoryActions).
export function DiscoveryCandidateHistoryTable({ title, items, emptyTitle }: { title: string; items: HistoryItem[]; emptyTitle: string }) {
  const [page, setPage] = useState(1);
  const showActions = useMemo(() => items.some((item) => hasDiscoveryCandidateHistoryAction(item.status)), [items]);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pages);
  const pagedItems = useMemo(() => items.slice((currentPage - 1) * pageSize, currentPage * pageSize), [items, currentPage, pageSize]);

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(1);
  }

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
          <Table resizable={false}>
            <TableHeader>
              <TableRow>
                <TableHead minWidth={170}>Source</TableHead>
                <TableHead minWidth={200}>Name</TableHead>
                <TableHead minWidth={180}>Website</TableHead>
                <TableHead minWidth={200}>Identifiers</TableHead>
                <TableHead minWidth={180}>Pharmacy</TableHead>
                <TableHead minWidth={110}>Status</TableHead>
                <TableHead minWidth={150}>Reviewed</TableHead>
                {showActions ? <TableHead minWidth={170} className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedItems.map((item) => (
                <TableRow key={item.id}>
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
        )}
      </CardContent>
      {items.length > 0 ? (
        <CardFooter className="border-t">
          <Pagination page={currentPage} setPage={setPage} pages={pages} total={items.length} pageSize={pageSize} onPageSizeChange={handlePageSizeChange} />
        </CardFooter>
      ) : null}
    </Card>
  );
}
