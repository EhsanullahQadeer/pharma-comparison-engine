"use client";

import { Ban, RefreshCw, Save, UserCheck } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { runPriceCollectionForMatch, updatePriceCollectionSchedule } from "@/actions/price-collection/price-collection";
import { rejectConfirmedProductMatches } from "@/actions/product-matches/product-matches";
import { SelectAllCheckbox } from "@/components/admin/bulk-action-bar";
import { DetectProductsButton } from "@/components/admin/detect-products-button";
import { OfferDeleteButton } from "@/components/admin/offer-delete-button";
import { OfferDiscountsModal } from "@/components/admin/offer-discounts-modal";
import { AddOfferModal, EditOfferModal } from "@/components/admin/offer-form-modal";
import { OfferPublishToggle, PublishAllOffersButton } from "@/components/admin/offer-publish-controls";
import { PriceBulkActions, confirmRejectPages } from "@/components/admin/price-bulk-actions";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { Checkbox } from "@/components/common/checkbox";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import { TableViewPagination } from "@/components/common/table-view-pagination";
import TooltipWrapper from "@/components/common/TooltipWrapper";
import type { Discount, Offer, PriceScrapeCadence, PriceScrapeStatus, ProductVariant } from "@/generated/prisma/client";
import { useRowSelection } from "@/hooks/useRowSelection";
import { useTableView } from "@/hooks/useTableView";
import { availabilityBadgeVariant, availabilityLabels, priceScrapeCadenceLabels, priceScrapeCadenceValues, purchaseModelLabels } from "@/lib/catalogue-labels";
import { deliveredTotalPence, variantLabel, variantMedicineNote } from "@/lib/comparison";
import { formatPence } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { PublicVariant } from "@/types/comparison";
import type { BulkPriceRow } from "@/types/pricing";
import type { TableSorters } from "@/types/table";

type OfferItem = Offer & { productVariant: ProductVariant; discounts: Discount[]; productMatch: { id: string } | null };

// A confirmed product page on the pharmacy's site that prices are collected from.
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
  productVariant: PublicVariant | null;
};

// One line of the table: a saved price, the product page it is collected from, or both. A price
// typed in by hand has no page; a page that hasn't been read yet has no price.
type PriceRow = { id: string; offer: OfferItem | null; match: MatchItem | null; variant: PublicVariant | null };

const bulkActions = ["publish", "schedule", "scrape", "humanScrape", "reject", "delete"] as const;

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

function scrapeStatus(match: MatchItem): PriceScrapeStatus {
  return match.requiresHumanAssist ? "HUMAN_VERIFICATION_REQUIRED" : match.lastScrapeStatus;
}

const sorters = {
  product: (row) => (row.variant ? variantLabel(row.variant) : null),
  price: (row) => row.offer?.itemPricePence,
  availability: (row) => (row.offer ? availabilityLabels[row.offer.availability] : null),
  published: (row) => (row.offer ? !!row.offer.publishedAt : null),
  status: (row) => (row.match ? scrapeStatusLabels[scrapeStatus(row.match)] : null),
  schedule: (row) => (row.match?.scrapeEnabled ? row.match.nextScrapeAt : null),
} satisfies TableSorters<PriceRow>;

function formatDate(value: Date | null): string {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "not set";
}

function buildRows(offers: OfferItem[], matches: MatchItem[]): PriceRow[] {
  const offersById = new Map(offers.map((offer) => [offer.id, offer]));
  const tracked = matches.map((match) => {
    const offer = (match.offerId ? offersById.get(match.offerId) : undefined) ?? null;
    return { id: match.id, offer, match, variant: offer?.productVariant ?? match.productVariant };
  });
  const trackedOfferIds = new Set(tracked.flatMap((row) => row.offer?.id ?? []));
  const untracked = offers.filter((offer) => !trackedOfferIds.has(offer.id)).map((offer) => ({ id: offer.id, offer, match: null, variant: offer.productVariant }));
  return [...tracked, ...untracked];
}

function ScheduleForm({ match, onError }: { match: MatchItem; onError: (error?: string) => void }) {
  const [isSaving, startSaving] = useTransition();
  const [cadence, setCadence] = useState<PriceScrapeCadence>(match.scrapeCadence);
  const [enabled, setEnabled] = useState(match.scrapeEnabled);

  function handleSubmit(formData: FormData) {
    onError(undefined);
    startSaving(async () => {
      const state = await updatePriceCollectionSchedule(match.id, formData);
      if (state.error) onError(state.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex items-center gap-1.5">
      <input
        name="scrapeEnabled"
        type="checkbox"
        checked={enabled}
        onChange={(event) => setEnabled(event.target.checked)}
        className="size-4"
        aria-label="Refresh this price automatically"
        title="Refresh this price automatically"
      />
      <select
        name="scrapeCadence"
        value={cadence}
        onChange={(event) => {
          const value = event.target.value as PriceScrapeCadence;
          setCadence(value);
          if (value === "MANUAL") setEnabled(false);
        }}
        className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
        aria-label="How often"
      >
        {priceScrapeCadenceValues.map((value) => (
          <option key={value} value={value}>{value === "MANUAL" ? "Manual" : priceScrapeCadenceLabels[value]}</option>
        ))}
      </select>
      <TooltipWrapper label={isSaving ? "Saving…" : "Save schedule"}>
        <Button type="submit" size="icon-sm" variant="outline" disabled={isSaving} aria-label="Save schedule">
          <Save aria-hidden="true" className="size-3.5" />
        </Button>
      </TooltipWrapper>
    </form>
  );
}

// Refresh / human-assisted / reject for a row collected from a product page.
function PageActions({ match, hasPrice, onError }: { match: MatchItem; hasPrice: boolean; onError: (error?: string) => void }) {
  const [isCollecting, startCollecting] = useTransition();
  const [isRejecting, startRejecting] = useTransition();
  const collectLabel = hasPrice ? "Refresh price" : "Collect price";

  function handleCollect(humanAssist: boolean) {
    onError(undefined);
    startCollecting(async () => {
      const state = await runPriceCollectionForMatch(match.id, humanAssist);
      onError(state.error);
    });
  }

  async function handleReject() {
    if (!(await confirmRejectPages(1, hasPrice ? 1 : 0))) return;
    onError(undefined);
    startRejecting(async () => {
      const state = await rejectConfirmedProductMatches([match.id]);
      onError(state.error);
    });
  }

  return (
    <>
      <TooltipWrapper label={isCollecting ? "Collecting…" : collectLabel}>
        <Button type="button" size="icon-sm" variant="outline" disabled={isCollecting} onClick={() => handleCollect(false)} aria-label={collectLabel}>
          <RefreshCw aria-hidden="true" className={cn("size-3.5", isCollecting && "animate-spin")} />
        </Button>
      </TooltipWrapper>
      <TooltipWrapper label="Human-assisted: open the page in Chrome">
        <Button type="button" size="icon-sm" variant="outline" disabled={isCollecting} onClick={() => handleCollect(true)} aria-label="Human-assisted price collection">
          <UserCheck aria-hidden="true" className="size-3.5" />
        </Button>
      </TooltipWrapper>
      <TooltipWrapper label={isRejecting ? "Rejecting…" : "Reject this page and remove its price"}>
        <Button type="button" size="icon-sm" variant="ghost" disabled={isCollecting || isRejecting} onClick={handleReject} className="text-destructive" aria-label="Reject this page">
          <Ban aria-hidden="true" className="size-3.5" />
        </Button>
      </TooltipWrapper>
    </>
  );
}

type PriceTableRowProps = { row: PriceRow; providerId: string; providerPublished: boolean; variants: ProductVariant[]; selected: boolean; onToggleSelected: (id: string, checked: boolean) => void };

function PriceTableRow({ row, providerId, providerPublished, variants, selected, onToggleSelected }: PriceTableRowProps) {
  const [error, setError] = useState<string>();
  const { offer, match, variant } = row;
  const label = variant ? variantLabel(variant) : "No variant selected";

  return (
    <TableRow data-state={selected ? "selected" : undefined}>
      <TableCell className="align-top">
        <Checkbox checked={selected} onCheckedChange={(checked) => onToggleSelected(row.id, checked === true)} aria-label={`Select ${label}`} />
      </TableCell>
      <TableCell className="align-top">
        <p className="font-medium">
          {label}
          {variant ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">{variantMedicineNote(variant)} · {variant.formulation}</span> : null}
        </p>
        {match ? (
          <a href={match.candidateUrl} target="_blank" rel="noopener noreferrer" className="block max-w-xs truncate text-xs text-muted-foreground hover:underline">{match.candidateUrl}</a>
        ) : (
          <p className="text-xs text-muted-foreground">Entered by hand</p>
        )}
      </TableCell>
      <TableCell className="align-top">
        {offer ? (
          <>
            <p className="font-medium">{formatPence(offer.itemPricePence)}</p>
            <p className="text-xs text-muted-foreground">{formatPence(deliveredTotalPence(offer))} delivered · {purchaseModelLabels[offer.purchaseModel]}</p>
          </>
        ) : (
          <Badge variant="secondary">Awaiting price</Badge>
        )}
      </TableCell>
      <TableCell className="align-top">
        {offer ? <Badge variant={availabilityBadgeVariant[offer.availability]}>{availabilityLabels[offer.availability]}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="align-top">
        {offer ? <Badge variant={offer.publishedAt ? "default" : "secondary"}>{offer.publishedAt ? "Published" : "Draft"}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="align-top">
        {match ? (
          <>
            <Badge variant={scrapeStatusVariants[scrapeStatus(match)]}>{scrapeStatusLabels[scrapeStatus(match)]}</Badge>
            <p className="text-xs text-muted-foreground">Last {formatDate(match.lastScrapedAt)} · next {formatDate(match.nextScrapeAt)}</p>
            {match.lastScrapeError ? <p className="max-w-xs text-xs wrap-break-word whitespace-normal text-destructive">{match.lastScrapeError}</p> : null}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Not tracked</span>
        )}
      </TableCell>
      <TableCell className="align-top">
        {match ? <ScheduleForm match={match} onError={setError} /> : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="align-top">
        <div className="flex items-center justify-end gap-1">
          {offer ? (
            <>
              <OfferPublishToggle offerId={offer.id} published={!!offer.publishedAt} providerPublished={providerPublished} />
              <OfferDiscountsModal offerId={offer.id} providerId={providerId} discounts={offer.discounts} />
              <EditOfferModal variants={variants} offer={offer} tracked={!!offer.productMatch} />
            </>
          ) : null}
          {/* A tracked price is rejected with its page; removing only the price would let the next check bring it back. */}
          {match ? <PageActions match={match} hasPrice={!!offer} onError={setError} /> : null}
          {offer && !match ? <OfferDeleteButton offerId={offer.id} label={label} /> : null}
        </div>
        {error ? <p role="alert" className="mt-1 ml-auto max-w-56 text-right text-xs wrap-break-word whitespace-normal text-destructive">{error}</p> : null}
      </TableCell>
    </TableRow>
  );
}

// A pharmacy's prices and the product pages they are collected from, in one table.
export function ProviderPricesSection({ providerId, providerPublished, offers, matches, variants }: { providerId: string; providerPublished: boolean; offers: OfferItem[]; matches: MatchItem[]; variants: ProductVariant[] }) {
  const rows = useMemo(() => buildRows(offers, matches), [offers, matches]);
  const view = useTableView(rows, sorters);
  // Selection covers the rows on the current page, so "select all" never reaches rows out of view.
  const ids = useMemo(() => view.rows.map((row) => row.id), [view.rows]);
  const selection = useRowSelection(ids);
  const selectedRows = useMemo<BulkPriceRow[]>(
    () => rows
      .filter((row) => selection.selectedIds.includes(row.id))
      .map((row) => ({ offerId: row.offer?.id ?? null, matchId: row.match?.id ?? null, published: !!row.offer?.publishedAt, providerPublished })),
    [rows, selection.selectedIds, providerPublished],
  );
  const draftCount = offers.filter((offer) => !offer.publishedAt).length;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-4">
        <CardTitle>Prices ({rows.length})</CardTitle>
        <div className="flex flex-wrap items-start justify-end gap-2">
          <DetectProductsButton providerId={providerId} />
          <PublishAllOffersButton providerId={providerId} draftCount={draftCount} providerPublished={providerPublished} />
          <AddOfferModal providerId={providerId} variants={variants} />
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {variants.length === 0 ? "Add a product variant to the catalogue before pricing an offer." : "No prices yet. Add one by hand, or detect this pharmacy's products and confirm a suggested page."}
          </p>
        ) : (
          <>
            <PriceBulkActions rows={selectedRows} actions={bulkActions} onClear={selection.clear} emptyHint="Tick prices to publish, schedule, scrape, reject or remove several at once." />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" resizable={false}>
                    <SelectAllCheckbox allSelected={selection.allSelected} someSelected={selection.someSelected} onToggleAll={selection.toggleAll} label="Select all prices" />
                  </TableHead>
                  <TableHead {...view.sortProps("product")}>Product</TableHead>
                  <TableHead {...view.sortProps("price")}>Price</TableHead>
                  <TableHead {...view.sortProps("availability")}>Availability</TableHead>
                  <TableHead {...view.sortProps("published")}>Public site</TableHead>
                  <TableHead {...view.sortProps("status")}>Price check</TableHead>
                  <TableHead {...view.sortProps("schedule")}>Schedule</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Keyed on the schedule too, so the row's schedule form picks up a bulk change. */}
                {view.rows.map((row) => (
                  <PriceTableRow
                    key={`${row.id}-${row.match?.scrapeEnabled}-${row.match?.scrapeCadence}`}
                    row={row}
                    providerId={providerId}
                    providerPublished={providerPublished}
                    variants={variants}
                    selected={selection.isSelected(row.id)}
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
