"use client";

import { useState, useTransition } from "react";

import { linkDiscoveryCandidateToProvider, rejectDiscoveryCandidate } from "@/actions/discovery/discovery-candidates";
import { Badge } from "@/components/common/badge";
import { Button, buttonVariants } from "@/components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import Link from "@/components/Link";
import type { DiscoverySourceType } from "@/generated/prisma/client";
import { identifierSummary } from "@/lib/discovery-identifier-summary";
import { discoverySourceTypeLabels } from "@/lib/discovery-labels";

type CandidateItem = {
  id: string;
  name: string;
  postcode: string | null;
  websiteDomain: string | null;
  companyNumber: string | null;
  cqcLocationId: string | null;
  odsCode: string | null;
  gphcNumber: string | null;
  source: { type: DiscoverySourceType };
  matchedProvider: { id: string; tradingName: string } | null;
};

function CandidateRow({ item }: { item: CandidateItem }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleConfirmLink() {
    const matchedProvider = item.matchedProvider;
    if (!matchedProvider) return;
    setError(undefined);
    startTransition(async () => {
      const result = await linkDiscoveryCandidateToProvider(item.id, matchedProvider.id);
      if (result.error) setError(result.error);
    });
  }

  function handleReject() {
    setError(undefined);
    startTransition(async () => {
      const result = await rejectDiscoveryCandidate(item.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{discoverySourceTypeLabels[item.source.type]}</TableCell>
      <TableCell className="max-w-xs">
        <p className="truncate font-medium">{item.name}</p>
        {item.postcode ? <p className="text-xs text-muted-foreground">{item.postcode}</p> : null}
      </TableCell>
      <TableCell className="text-muted-foreground">{item.websiteDomain ?? "—"}</TableCell>
      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{identifierSummary(item)}</TableCell>
      <TableCell>
        {item.matchedProvider ? (
          <Badge variant="outline">Possible match: {item.matchedProvider.tradingName}</Badge>
        ) : (
          <Badge variant="secondary">New</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-wrap justify-end gap-1">
          {item.matchedProvider ? (
            <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={handleConfirmLink}>Confirm link</Button>
          ) : (
            <Link href={`/admin/pharmacies/new?fromCandidate=${item.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
              Promote
            </Link>
          )}
          <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={handleReject}>Reject</Button>
        </div>
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </TableCell>
    </TableRow>
  );
}

export function DiscoveryCandidateReviewTable({ items }: { items: CandidateItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Discovery candidates ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {items.length === 0 ? (
          <EmptyState title="No discovery candidates awaiting review." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Identifiers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => <CandidateRow key={item.id} item={item} />)}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
