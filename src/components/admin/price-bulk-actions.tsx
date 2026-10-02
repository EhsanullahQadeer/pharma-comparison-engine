"use client";

import { Ban, CalendarClock, ChevronDown, Eye, EyeOff, RefreshCw, Square, Trash2, UserCheck } from "lucide-react";
import { useRef } from "react";

import { deleteOffers, setOffersPublished } from "@/actions/offers/offers";
import { runPriceCollectionForMatch, updatePriceCollectionSchedules } from "@/actions/price-collection/price-collection";
import { rejectConfirmedProductMatches } from "@/actions/product-matches/product-matches";
import { BulkActionBar, plural } from "@/components/admin/bulk-action-bar";
import { Button } from "@/components/common/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/common/dropdown-menu";
import type { PriceScrapeCadence } from "@/generated/prisma/client";
import { useBulkRun } from "@/hooks/useBulkRun";
import { useRouter } from "@/hooks/useRouter";
import { priceScrapeCadenceLabels, priceScrapeCadenceValues } from "@/lib/catalogue-labels";
import { confirm } from "@/lib/confirm-store";
import { cn } from "@/lib/utils";
import type { BulkPriceRow } from "@/types/pricing";

export type PriceBulkAction = "publish" | "schedule" | "scrape" | "humanScrape" | "reject" | "delete";

// Shared by the bulk toolbar and each row's own Reject button, so both ask the same question.
export async function confirmRejectPages(pages: number, withPrice: number) {
  const priceNote = withPrice > 0 ? ` ${plural(withPrice, "saved price")} from ${withPrice === 1 ? "it" : "them"} will be removed too, and disappear from the public site if published.` : "";
  return confirm({
    title: `Reject ${plural(pages, "product page")}?`,
    message: `${pages === 1 ? "This page" : "These pages"} will be taken out of price collection and won't be suggested again.${priceNote}`,
    confirmText: "Reject",
    variant: "destructive",
  });
}

// Toolbar shown above a price table while rows are selected. Each action only touches the rows it
// applies to (publish/delete need a saved price, schedule/scrape need a tracked product page).
// With `emptyHint` the toolbar stays visible (buttons disabled) while nothing is selected.
export function PriceBulkActions({ rows, actions, onClear, emptyHint }: { rows: BulkPriceRow[]; actions: readonly PriceBulkAction[]; onClear: () => void; emptyHint?: string }) {
  const router = useRouter();
  const bulk = useBulkRun(onClear);
  const { state, run } = bulk;
  const stopRequested = useRef(false);

  const offerIds = rows.flatMap((row) => row.offerId ?? []);
  const matchIds = rows.flatMap((row) => row.matchId ?? []);
  const untracked = rows.length - matchIds.length;
  const has = (action: PriceBulkAction) => actions.includes(action);
  // Where pages can be rejected, "Remove" only takes prices no page is tracking: removing a tracked
  // price would let the next check bring it back, so those go through "Reject" instead.
  const removableOfferIds = has("reject") ? rows.flatMap((row) => (row.matchId ? [] : row.offerId ?? [])) : offerIds;

  function handlePublish(published: boolean) {
    void run(async () => {
      const result = await setOffersPublished(offerIds, published);
      if (result.error) return { error: result.error };
      const skipped = result.skipped ? ` ${plural(result.skipped, "price")} skipped — publish the pharmacy first.` : "";
      return { message: `${published ? "Published" : "Unpublished"} ${plural(result.updated ?? 0, "price")}.${skipped}` };
    });
  }

  function handleSchedule(cadence: PriceScrapeCadence) {
    void run(async () => {
      const result = await updatePriceCollectionSchedules(matchIds, cadence);
      if (result.error) return { error: result.error };
      const label = cadence === "MANUAL" ? "turned off" : `set to ${cadence.toLowerCase()}`;
      const skipped = untracked > 0 ? ` ${plural(untracked, "row")} skipped — not tracked from a product page.` : "";
      return { message: `Schedule ${label} for ${plural(result.updated ?? 0, "product page")}.${skipped}` };
    });
  }

  // One scrape at a time, like the scheduled runner — pharmacy sites are fetched politely, and staff
  // can stop between pages. Human-assisted opens each page in the visible Chrome window, where a
  // person completes any security check.
  function handleScrape(humanAssist: boolean) {
    stopRequested.current = false;
    void run(async () => {
      const ids = [...matchIds];
      let scraped = 0;
      const failures: string[] = [];
      for (const [index, matchId] of ids.entries()) {
        if (stopRequested.current) break;
        bulk.setProgress(`Scraping ${index + 1} of ${ids.length}…`);
        const result = await runPriceCollectionForMatch(matchId, humanAssist);
        if (result.error) failures.push(result.error);
        else scraped += 1;
      }
      router.refresh();
      const stopped = stopRequested.current ? " Stopped early." : "";
      if (failures.length === 0) return { message: `Scraped ${plural(scraped, "price")}.${stopped}` };
      return { error: `Scraped ${scraped}, ${failures.length} failed (first error: ${failures[0]}).${stopped}` };
    }, `Scraping 1 of ${matchIds.length}…`);
  }

  async function handleReject() {
    const withPrice = rows.filter((row) => row.matchId && row.offerId).length;
    if (!(await confirmRejectPages(matchIds.length, withPrice))) return;
    void run(async () => {
      const result = await rejectConfirmedProductMatches(matchIds);
      if (result.error) return { error: result.error };
      const prices = result.removedPrices ? ` ${plural(result.removedPrices, "price")} removed.` : "";
      return { message: `Rejected ${plural(result.rejected ?? 0, "product page")}.${prices}` };
    });
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `Remove ${plural(removableOfferIds.length, "price")}?`,
      message: "The selected prices and their price history will be removed. Published prices disappear from the public site.",
      confirmText: "Remove",
      variant: "destructive",
    });
    if (!ok) return;
    void run(async () => {
      const result = await deleteOffers(removableOfferIds);
      if (result.error) return { error: result.error };
      const kept = offerIds.length - removableOfferIds.length;
      const skipped = kept > 0 ? ` ${plural(kept, "tracked price")} left alone — use Reject for those.` : "";
      return { message: `Removed ${plural(result.updated ?? 0, "price")}.${skipped}` };
    });
  }

  const disabled = state.busy || rows.length === 0;

  return (
    <BulkActionBar count={rows.length} bulk={bulk} onClear={onClear} emptyHint={emptyHint}>
      {has("publish") ? (
        <>
          <Button type="button" size="sm" variant="outline" disabled={disabled || offerIds.length === 0} onClick={() => handlePublish(true)}>
            <Eye aria-hidden="true" className="size-4" />
            Publish
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={disabled || offerIds.length === 0} onClick={() => handlePublish(false)}>
            <EyeOff aria-hidden="true" className="size-4" />
            Unpublish
          </Button>
        </>
      ) : null}
      {has("schedule") ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button type="button" size="sm" variant="outline" disabled={disabled || matchIds.length === 0} />}>
            <CalendarClock aria-hidden="true" className="size-4" />
            Schedule
            <ChevronDown aria-hidden="true" className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Automatic price refresh</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {priceScrapeCadenceValues.map((cadence) => (
                <DropdownMenuItem key={cadence} onClick={() => handleSchedule(cadence)}>
                  {priceScrapeCadenceLabels[cadence]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {has("scrape") ? (
        <Button type="button" size="sm" variant="outline" disabled={disabled || matchIds.length === 0} onClick={() => handleScrape(false)}>
          <RefreshCw aria-hidden="true" className={cn("size-4", state.busy && state.progress && "animate-spin")} />
          Scrape now
        </Button>
      ) : null}
      {has("humanScrape") ? (
        <Button type="button" size="sm" variant="outline" disabled={disabled || matchIds.length === 0} onClick={() => handleScrape(true)}>
          <UserCheck aria-hidden="true" className="size-4" />
          Human-assisted scrape
        </Button>
      ) : null}
      {has("reject") ? (
        <Button type="button" size="sm" variant="ghost" disabled={disabled || matchIds.length === 0} onClick={handleReject} className="text-destructive">
          <Ban aria-hidden="true" className="size-4" />
          Reject
        </Button>
      ) : null}
      {has("delete") ? (
        <Button type="button" size="sm" variant="ghost" disabled={disabled || removableOfferIds.length === 0} onClick={handleDelete} className="text-destructive">
          <Trash2 aria-hidden="true" className="size-4" />
          Remove
        </Button>
      ) : null}
      {state.busy && state.progress ? (
        <Button type="button" size="sm" variant="ghost" onClick={() => { stopRequested.current = true; }}>
          <Square aria-hidden="true" className="size-3.5" />
          Stop
        </Button>
      ) : null}
    </BulkActionBar>
  );
}
