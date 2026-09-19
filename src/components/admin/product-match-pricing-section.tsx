"use client";

import { useState, useTransition } from "react";

import { runPriceCollectionForMatch } from "@/actions/price-collection/price-collection";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import type { Ingredient } from "@/generated/prisma/client";
import { ingredientLabels } from "@/lib/catalogue-labels";

type MatchItem = {
  id: string;
  candidateUrl: string;
  offerId: string | null;
  productVariant: { ingredient: Ingredient; brandName: string | null; strengthMg: number; packQuantity: number; formulation: string } | null;
};

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function MatchRow({ item }: { item: MatchItem }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ itemPricePence: number; deliveryFeePence: number; created: boolean }>();

  function handleCollect() {
    setError(undefined);
    startTransition(async () => {
      const state = await runPriceCollectionForMatch(item.id);
      if (state.error) {
        setError(state.error);
        return;
      }
      if (state.result) setResult(state.result);
    });
  }

  const variant = item.productVariant;
  let buttonLabel = item.offerId ? "Refresh price" : "Collect price";
  if (isPending) buttonLabel = "Collecting…";

  return (
    <TableRow>
      <TableCell className="text-muted-foreground">
        {variant ? `${ingredientLabels[variant.ingredient]} ${variant.strengthMg}mg × ${variant.packQuantity} (${variant.formulation})` : "—"}
      </TableCell>
      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
        <a href={item.candidateUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{item.candidateUrl}</a>
      </TableCell>
      <TableCell>
        {item.offerId ? <Badge variant="default">Priced</Badge> : <Badge variant="secondary">Awaiting price</Badge>}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-col items-end gap-1">
          <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={handleCollect}>
            {buttonLabel}
          </Button>
          {error ? <p className="max-w-xs text-right text-xs text-destructive">{error}</p> : null}
          {result ? (
            <p className="text-right text-xs text-muted-foreground">
              {formatPence(result.itemPricePence)} + {formatPence(result.deliveryFeePence)} delivery
            </p>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ProductMatchPricingSection({ items }: { items: MatchItem[] }) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirmed product matches ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product variant</TableHead>
              <TableHead>Matched page</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => <MatchRow key={item.id} item={item} />)}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
