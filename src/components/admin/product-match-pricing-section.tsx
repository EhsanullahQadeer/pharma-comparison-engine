"use client";

import { useMemo, useState, useTransition } from "react";

import { runPriceCollectionForMatch, updatePriceCollectionSchedule } from "@/actions/price-collection/price-collection";
import { rejectConfirmedProductMatches } from "@/actions/product-matches/product-matches";
import { SelectAllCheckbox } from "@/components/admin/bulk-action-bar";
import { PriceBulkActions, confirmRejectPages } from "@/components/admin/price-bulk-actions";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { Checkbox } from "@/components/common/checkbox";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import type { Ingredient, PriceScrapeCadence, PriceScrapeStatus } from "@/generated/prisma/client";
import { useRowSelection } from "@/hooks/useRowSelection";
import { ingredientLabels } from "@/lib/catalogue-labels";
import type { BulkPriceRow } from "@/types/pricing";

type MatchItem = {
  id: string;
  candidateUrl: string;
  offerId: string | null;
  scrapeEnabled: boolean;
  scrapeCadence: PriceScrapeCadence;
  nextScrapeAt: Date | null;
  lastScrapedAt: Date | null;
  lastScrapeStatus: PriceScrapeStatus;
  lastScrapeError: string | null;
  requiresHumanAssist: boolean;
  productVariant: { ingredient: Ingredient; brandName: string | null; strengthMg: number; packQuantity: number; formulation: string } | null;
  offer: { itemPricePence: number; deliveryFeePence: number; retrievedAt: Date; updatedAt: Date; publishedAt: Date | null } | null;
};

const bulkActions = ["schedule", "scrape", "reject"] as const;

const scrapeStatusLabels: Record<PriceScrapeStatus, string> = {
  NOT_CONFIGURED: "Not configured",
  READY: "Ready",
  SCRAPED: "Scraped",
  NEEDS_REVIEW: "Needs review",
  HUMAN_VERIFICATION_REQUIRED: "Human verification",
  FAILED: "Failed",
};

const scrapeStatusVariants: Record<PriceScrapeStatus, "default" | "secondary" | "destructive" | "outline"> = {
  NOT_CONFIGURED: "secondary",
  READY: "outline",
  SCRAPED: "default",
  NEEDS_REVIEW: "outline",
  HUMAN_VERIFICATION_REQUIRED: "destructive",
  FAILED: "destructive",
};

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function formatDate(value: Date | null): string {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not set";
}

function MatchRow({ item, selected, onToggleSelected }: { item: MatchItem; selected: boolean; onToggleSelected: (id: string, checked: boolean) => void }) {
  const [isCollecting, startCollecting] = useTransition();
  const [isSavingSchedule, startSavingSchedule] = useTransition();
  const [isRejecting, startRejecting] = useTransition();
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ itemPricePence: number; deliveryFeePence: number; created: boolean; updatedAt: Date }>();
  const [cadence, setCadence] = useState<PriceScrapeCadence>(item.scrapeCadence);
  const [enabled, setEnabled] = useState(item.scrapeEnabled);

  function handleCollect(humanAssist: boolean) {
    setError(undefined);
    startCollecting(async () => {
      const state = await runPriceCollectionForMatch(item.id, humanAssist);
      if (state.error) {
        setError(state.error);
        return;
      }
      if (state.result) setResult(state.result);
    });
  }

  async function handleReject() {
    if (!(await confirmRejectPages(1, item.offerId ? 1 : 0))) return;
    setError(undefined);
    startRejecting(async () => {
      const state = await rejectConfirmedProductMatches([item.id]);
      if (state.error) setError(state.error);
    });
  }

  function handleScheduleSubmit(formData: FormData) {
    setError(undefined);
    startSavingSchedule(async () => {
      const state = await updatePriceCollectionSchedule(item.id, formData);
      if (state.error) setError(state.error);
    });
  }

  const variant = item.productVariant;
  const price = result ?? item.offer;
  const status = item.requiresHumanAssist ? "HUMAN_VERIFICATION_REQUIRED" : item.lastScrapeStatus;
  let collectButtonLabel = item.offerId ? "Refresh price" : "Collect price";
  if (isCollecting) collectButtonLabel = "Collecting...";

  return (
    <TableRow data-state={selected ? "selected" : undefined}>
      <TableCell className="align-top">
        <Checkbox checked={selected} onCheckedChange={(checked) => onToggleSelected(item.id, checked === true)} aria-label="Select this product page" />
      </TableCell>
      <TableCell className="align-top">
        <div className="space-y-1">
          <p className="font-medium">
            {variant ? `${ingredientLabels[variant.ingredient]} ${variant.strengthMg}mg × ${variant.packQuantity} (${variant.formulation})` : "No variant selected"}
          </p>
          {variant?.brandName ? <p className="text-xs text-muted-foreground">{variant.brandName}</p> : null}
          <a href={item.candidateUrl} target="_blank" rel="noopener noreferrer" className="block max-w-sm truncate text-xs text-muted-foreground hover:underline">
            {item.candidateUrl}
          </a>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div className="space-y-1">
          <Badge variant={scrapeStatusVariants[status]}>{scrapeStatusLabels[status]}</Badge>
          <p className="text-xs text-muted-foreground">Last: {formatDate(item.lastScrapedAt)}</p>
          <p className="text-xs text-muted-foreground">Next: {formatDate(item.nextScrapeAt)}</p>
          {item.lastScrapeError ? <p className="max-w-xs text-xs text-destructive">{item.lastScrapeError}</p> : null}
        </div>
      </TableCell>
      <TableCell className="align-top">
        {price ? (
          <div className="space-y-1 text-sm">
            <p>{formatPence(price.itemPricePence)} + {formatPence(price.deliveryFeePence)} delivery</p>
            <p className="text-xs text-muted-foreground">Offer {item.offer?.publishedAt ? "published" : "draft"} · retrieved {formatDate(item.offer?.retrievedAt ?? null)}</p>
            <p className="text-xs text-muted-foreground">Updated {formatDate("updatedAt" in price ? price.updatedAt : item.offer?.updatedAt ?? null)}</p>
          </div>
        ) : (
          <Badge variant="secondary">Awaiting price</Badge>
        )}
      </TableCell>
      <TableCell className="align-top">
        <form action={handleScheduleSubmit} className="flex flex-wrap items-center justify-end gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              name="scrapeEnabled"
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="size-4"
            />
            Schedule
          </label>
          <select
            name="scrapeCadence"
            value={cadence}
            onChange={(event) => {
              const value = event.target.value as PriceScrapeCadence;
              setCadence(value);
              if (value === "MANUAL") setEnabled(false);
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="MANUAL">Manual</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
          <Button type="submit" size="sm" variant="outline" disabled={isSavingSchedule}>
            {isSavingSchedule ? "Saving..." : "Save"}
          </Button>
        </form>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex flex-col items-end gap-2">
          <Button type="button" size="sm" variant="outline" disabled={isCollecting} onClick={() => handleCollect(false)}>
            {collectButtonLabel}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={isCollecting} onClick={() => handleCollect(true)}>
            Human-assisted
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={isCollecting || isRejecting} onClick={handleReject} className="text-destructive">
            {isRejecting ? "Rejecting..." : "Reject"}
          </Button>
          {error ? <p className="max-w-xs text-right text-xs text-destructive">{error}</p> : null}
          {result ? (
            <p className="text-right text-xs text-muted-foreground">
              Saved {formatPence(result.itemPricePence)} + {formatPence(result.deliveryFeePence)} delivery
              {" "}· updated {formatDate(result.updatedAt)}
            </p>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ProductMatchPricingSection({ items }: { items: MatchItem[] }) {
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const selection = useRowSelection(ids);
  const selectedRows = useMemo<BulkPriceRow[]>(
    () => items
      .filter((item) => selection.selectedIds.includes(item.id))
      .map((item) => ({ offerId: item.offerId, matchId: item.id, published: !!item.offer?.publishedAt, providerPublished: false })),
    [items, selection.selectedIds],
  );

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price collection ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <PriceBulkActions rows={selectedRows} actions={bulkActions} onClear={selection.clear} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" resizable={false}>
                <SelectAllCheckbox allSelected={selection.allSelected} someSelected={selection.someSelected} onToggleAll={selection.toggleAll} label="Select all product pages" />
              </TableHead>
              <TableHead>Confirmed variant</TableHead>
              <TableHead>Scrape status</TableHead>
              <TableHead>Latest draft price</TableHead>
              <TableHead className="text-right">Schedule</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Keyed on the schedule too, so the row's schedule form picks up a bulk change. */}
            {items.map((item) => (
              <MatchRow
                key={`${item.id}-${item.scrapeEnabled}-${item.scrapeCadence}`}
                item={item}
                selected={selection.isSelected(item.id)}
                onToggleSelected={selection.toggle}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
