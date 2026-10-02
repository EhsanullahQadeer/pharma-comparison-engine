"use client";

import { Ban, Check, RefreshCw, UserCheck } from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";

import { confirmAndCollectProductMatch, confirmProductMatch, rejectProductMatch } from "@/actions/product-matches/product-matches";
import { SelectAllCheckbox } from "@/components/admin/bulk-action-bar";
import { ProductMatchBulkActions, type ProductMatchBulkRow } from "@/components/admin/product-match-bulk-actions";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { Checkbox } from "@/components/common/checkbox";
import { EmptyState } from "@/components/common/empty-state";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import { TableViewPagination } from "@/components/common/table-view-pagination";
import TooltipWrapper from "@/components/common/TooltipWrapper";
import type { Ingredient, ProductMatchConfidence } from "@/generated/prisma/client";
import { useRowSelection } from "@/hooks/useRowSelection";
import { useTableView } from "@/hooks/useTableView";
import { ingredientLabels } from "@/lib/catalogue-labels";
import { cn } from "@/lib/utils";
import type { TableSorters } from "@/types/table";

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

const sorters = {
  provider: (item) => item.provider.tradingName,
  page: (item) => item.candidateUrl,
  ingredient: (item) => ingredientLabels[item.matchedIngredient],
  confidence: (item) => item.confidence === "HIGH",
} satisfies TableSorters<MatchItem>;

type MatchRowProps = {
  item: MatchItem;
  variants: VariantOption[];
  showProvider: boolean;
  // The variant chosen for this row; held by the table so the bulk toolbar can use it too.
  productVariantId: string;
  onVariantChange: (id: string, productVariantId: string) => void;
  selected: boolean;
  onToggleSelected: (id: string, checked: boolean) => void;
};

function MatchRow({ item, variants, showProvider, productVariantId, onVariantChange, selected, onToggleSelected }: MatchRowProps) {
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
    <TableRow data-state={selected ? "selected" : undefined}>
      <TableCell>
        <Checkbox checked={selected} onCheckedChange={(checked) => onToggleSelected(item.id, checked === true)} aria-label={`Select ${item.candidateUrl}`} />
      </TableCell>
      {showProvider ? <TableCell className="font-medium">{item.provider.tradingName}</TableCell> : null}
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
          onChange={(event) => onVariantChange(item.id, event.target.value)}
          disabled={variants.length === 0}
          className="h-7 w-full max-w-64 rounded-md border border-input bg-transparent px-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="" disabled>Choose the exact variant…</option>
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.brandName ?? ingredientLabels[variant.ingredient]} ({ingredientLabels[variant.ingredient]}) {variant.strengthMg}mg × {variant.packQuantity} ({variant.formulation})
            </option>
          ))}
        </select>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <TooltipWrapper label="Confirm & scrape the price">
            <Button type="button" size="icon-sm" variant="default" disabled={isPending || !productVariantId} onClick={() => handleConfirmAndScrape(false)} aria-label="Confirm and scrape the price">
              <RefreshCw aria-hidden="true" className={cn("size-3.5", isPending && "animate-spin")} />
            </Button>
          </TooltipWrapper>
          <TooltipWrapper label="Confirm only">
            <Button type="button" size="icon-sm" variant="outline" disabled={isPending || !productVariantId} onClick={handleConfirm} aria-label="Confirm only">
              <Check aria-hidden="true" className="size-3.5" />
            </Button>
          </TooltipWrapper>
          <TooltipWrapper label="Confirm & human-assisted scrape in Chrome">
            <Button type="button" size="icon-sm" variant="outline" disabled={isPending || !productVariantId} onClick={() => handleConfirmAndScrape(true)} aria-label="Confirm and human-assisted scrape">
              <UserCheck aria-hidden="true" className="size-3.5" />
            </Button>
          </TooltipWrapper>
          <TooltipWrapper label="Reject this page">
            <Button type="button" size="icon-sm" variant="ghost" disabled={isPending} onClick={handleReject} className="text-destructive" aria-label="Reject this page">
              <Ban aria-hidden="true" className="size-3.5" />
            </Button>
          </TooltipWrapper>
        </div>
        {savedResult ? <p role="status" className="mt-1 text-xs text-muted-foreground">Saved £{(savedResult.itemPricePence / 100).toFixed(2)} + £{(savedResult.deliveryFeePence / 100).toFixed(2)} delivery</p> : null}
        {error ? <p role="alert" className="mt-1 ml-auto max-w-56 text-xs wrap-break-word whitespace-normal text-destructive">{error}</p> : null}
      </TableCell>
    </TableRow>
  );
}

// Shared by the Reviews page (every pharmacy) and a pharmacy's own page (`showProvider={false}`,
// its suggestions only, confirmed in place next to its price collection list).
export function ProductMatchReviewTable({ items, variants, title = "Product matches", showProvider = true }: { items: MatchItem[]; variants: VariantOption[]; title?: string; showProvider?: boolean }) {
  const view = useTableView(items, sorters);
  // Selection covers every row, not just the page on screen: "select all" and the bulk actions reach
  // all pages, and the toolbar's count says how many that is.
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const selection = useRowSelection(ids);
  // Variants staff picked by hand. Otherwise only detection's own suggestion is pre-selected:
  // defaulting to the first catalogue variant got pages confirmed to a product they don't sell with
  // one click.
  const [choices, setChoices] = useState<Record<string, string>>({});
  const handleVariantChange = useCallback((id: string, productVariantId: string) => setChoices((prev) => ({ ...prev, [id]: productVariantId })), []);
  const selectedRows = useMemo<ProductMatchBulkRow[]>(
    () => items
      .filter((item) => selection.selectedIds.includes(item.id))
      .map((item) => ({ matchId: item.id, productVariantId: choices[item.id] ?? item.productVariantId ?? "" })),
    [items, selection.selectedIds, choices],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title} ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {items.length === 0 ? (
          <EmptyState title="No product matches awaiting review." />
        ) : (
          <>
          <ProductMatchBulkActions rows={selectedRows} onClear={selection.clear} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" resizable={false}>
                  <SelectAllCheckbox allSelected={selection.allSelected} someSelected={selection.someSelected} onToggleAll={selection.toggleAll} label="Select all suggested pages" />
                </TableHead>
                {showProvider ? <TableHead {...view.sortProps("provider")}>Provider</TableHead> : null}
                <TableHead {...view.sortProps("page")}>Matched page</TableHead>
                <TableHead {...view.sortProps("ingredient")}>Ingredient</TableHead>
                <TableHead {...view.sortProps("confidence")}>Confidence</TableHead>
                <TableHead>Exact variant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.rows.map((item) => (
                <MatchRow
                  key={item.id}
                  item={item}
                  variants={variants}
                  showProvider={showProvider}
                  productVariantId={choices[item.id] ?? item.productVariantId ?? ""}
                  onVariantChange={handleVariantChange}
                  selected={selection.isSelected(item.id)}
                  onToggleSelected={selection.toggle}
                />
              ))}
            </TableBody>
          </Table>
          <TableViewPagination pagination={view.pagination} className="px-(--card-spacing)" />
          </>
        )}
      </CardContent>
    </Card>
  );
}
