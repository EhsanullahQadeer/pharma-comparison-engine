"use client";

import { useState, useTransition } from "react";

import { confirmAndCollectProductMatch, confirmProductMatch, rejectProductMatch } from "@/actions/product-matches/product-matches";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import type { Ingredient, ProductMatchConfidence } from "@/generated/prisma/client";
import { ingredientLabels } from "@/lib/catalogue-labels";

type MatchItem = {
  id: string;
  candidateUrl: string;
  matchedIngredient: Ingredient;
  matchedTokens: string[];
  confidence: ProductMatchConfidence;
  // Set when detection found this exact strength/pack priced on the page.
  productVariantId: string | null;
  provider: { id: string; tradingName: string };
};

type VariantOption = { id: string; ingredient: Ingredient; brandName: string | null; strengthMg: number; packQuantity: number; formulation: string };

function MatchRow({ item, variants }: { item: MatchItem; variants: VariantOption[] }) {
  const matchingVariants = variants.filter((variant) => variant.ingredient === item.matchedIngredient);
  const [productVariantId, setProductVariantId] = useState(item.productVariantId ?? matchingVariants[0]?.id ?? variants[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [savedResult, setSavedResult] = useState<{ itemPricePence: number; deliveryFeePence: number; updatedAt: Date }>();

  function handleConfirm() {
    if (!productVariantId) return;
    setError(undefined);
    startTransition(async () => {
      const result = await confirmProductMatch(item.id, productVariantId);
      if (result.error) setError(result.error);
    });
  }

  function handleConfirmAndScrape(humanAssist: boolean) {
    if (!productVariantId) return;
    setError(undefined);
    setSavedResult(undefined);
    startTransition(async () => {
      const result = await confirmAndCollectProductMatch(item.id, productVariantId, humanAssist);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.result) setSavedResult(result.result);
    });
  }

  function handleReject() {
    setError(undefined);
    startTransition(async () => {
      const result = await rejectProductMatch(item.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{item.provider.tradingName}</TableCell>
      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
        <a href={item.candidateUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{item.candidateUrl}</a>
      </TableCell>
      <TableCell className="text-muted-foreground">{ingredientLabels[item.matchedIngredient]}</TableCell>
      <TableCell>
        <Badge variant={item.confidence === "HIGH" ? "default" : "secondary"}>{item.confidence === "HIGH" ? "Dedicated page" : "Category mention"}</Badge>
      </TableCell>
      <TableCell>
        <select
          value={productVariantId}
          onChange={(event) => setProductVariantId(event.target.value)}
          disabled={variants.length === 0}
          className="h-8 w-full max-w-56 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {ingredientLabels[variant.ingredient]} {variant.strengthMg}mg × {variant.packQuantity} ({variant.formulation})
            </option>
          ))}
        </select>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-wrap justify-end gap-1">
          <Button type="button" size="sm" variant="default" disabled={isPending || !productVariantId} onClick={() => handleConfirmAndScrape(false)}>Confirm & scrape</Button>
          <Button type="button" size="sm" variant="outline" disabled={isPending || !productVariantId} onClick={handleConfirm}>Confirm</Button>
          <Button type="button" size="sm" variant="outline" disabled={isPending || !productVariantId} onClick={() => handleConfirmAndScrape(true)}>Human scrape</Button>
          <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={handleReject}>Reject</Button>
        </div>
        {savedResult ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Saved £{(savedResult.itemPricePence / 100).toFixed(2)} + £{(savedResult.deliveryFeePence / 100).toFixed(2)} delivery · updated {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(savedResult.updatedAt))}
          </p>
        ) : null}
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </TableCell>
    </TableRow>
  );
}

export function ProductMatchReviewTable({ items, variants }: { items: MatchItem[]; variants: VariantOption[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Product matches ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {items.length === 0 ? (
          <EmptyState title="No product matches awaiting review." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Matched page</TableHead>
                <TableHead>Ingredient</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Exact variant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => <MatchRow key={item.id} item={item} variants={variants} />)}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
