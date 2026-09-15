"use client";

import { Check, X } from "lucide-react";
import { useState, useTransition } from "react";

import { reviewEvidence } from "@/actions/evidence/evidence";
import { Button } from "@/components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import Link from "@/components/Link";

type EvidenceItem = {
  id: string;
  sourceUrl: string;
  retrievedAt: Date;
  provider: { tradingName: string } | null;
  offer: { id: string; providerId: string } | null;
};

function EvidenceRow({ item }: { item: EvidenceItem }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleDecision(decision: "APPROVED" | "REJECTED") {
    setError(undefined);
    startTransition(async () => {
      const result = await reviewEvidence(item.id, decision);
      if (result.error) setError(result.error);
    });
  }

  const providerId = item.offer?.providerId;

  return (
    <TableRow>
      <TableCell className="max-w-xs truncate">
        <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">{item.sourceUrl}</a>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {providerId ? <Link href={`/admin/pharmacies/${providerId}`} className="hover:underline">{item.provider?.tradingName ?? "—"}</Link> : (item.provider?.tradingName ?? "—")}
      </TableCell>
      <TableCell className="text-muted-foreground">{new Date(item.retrievedAt).toLocaleDateString("en-GB")}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button type="button" size="icon-sm" variant="outline" disabled={isPending} onClick={() => handleDecision("APPROVED")}>
            <Check aria-hidden="true" className="size-4" />
            <span className="sr-only">Approve</span>
          </Button>
          <Button type="button" size="icon-sm" variant="destructive" disabled={isPending} onClick={() => handleDecision("REJECTED")}>
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">Reject</span>
          </Button>
        </div>
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </TableCell>
    </TableRow>
  );
}

export function EvidenceReviewTable({ items }: { items: EvidenceItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending evidence ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing pending review.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Retrieved</TableHead>
                <TableHead className="text-right">Decision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => <EvidenceRow key={item.id} item={item} />)}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
