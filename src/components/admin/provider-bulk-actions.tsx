"use client";

import { ArrowRightLeft, ChevronDown, Globe, RefreshCw, Square } from "lucide-react";
import { useMemo } from "react";

import { publishProvidersOffers } from "@/actions/offers/offers";
import { getPublishedPricePages } from "@/actions/price-collection/price-collection";
import { transitionProviderStatuses } from "@/actions/providers/providers";
import { BulkActionBar, plural } from "@/components/admin/bulk-action-bar";
import { Button } from "@/components/common/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/common/dropdown-menu";
import type { ProviderStatus, StaffRole } from "@/generated/prisma/client";
import { useBulkRun } from "@/hooks/useBulkRun";
import { useBulkScrape } from "@/hooks/useBulkScrape";
import { confirm } from "@/lib/confirm-store";
import { providerStatusLabels } from "@/lib/provider-labels";
import { destructiveProviderStatuses, getAllowedNextStatuses } from "@/lib/provider-status-transitions";
import { cn } from "@/lib/utils";

const statusOrder = Object.keys(providerStatusLabels) as ProviderStatus[];

type SelectedProvider = { id: string; status: ProviderStatus; draftCount: number };

// Toolbar on top of the Pharmacies list. "Move to…" only offers statuses at least one selected
// pharmacy can reach, with how many can; the rest of the selection is skipped by the same
// step-by-step rules as the single-pharmacy buttons. "Publish draft prices" only counts drafts of
// selected pharmacies that are already published. "Scrape published prices" re-checks every
// published price of the selection that is tracked from a product page, one page at a time: a plain
// request, then a background browser, then the visible Chrome window for a page neither could price.
export function ProviderBulkActions({ providers, role, onClear }: { providers: SelectedProvider[]; role: StaffRole; onClear: () => void }) {
  const bulk = useBulkRun(onClear);
  const { state, run } = bulk;
  const { scrapeMatches, stop } = useBulkScrape(bulk.setProgress);

  const options = useMemo(
    () => statusOrder
      .map((status) => ({ status, count: providers.filter((provider) => getAllowedNextStatuses(provider.status, role).includes(status)).length }))
      .filter((option) => option.count > 0),
    [providers, role],
  );
  const publishableDrafts = providers.reduce((total, provider) => total + (provider.status === "PUBLISHED" ? provider.draftCount : 0), 0);

  async function handleMove(next: ProviderStatus, eligible: number) {
    const label = providerStatusLabels[next];
    if (destructiveProviderStatuses.includes(next)) {
      const ok = await confirm({
        title: `Move ${plural(eligible, "pharmacy", "pharmacies")} to ${label}?`,
        message: "They stop showing on the public site, along with their prices, until they're published again.",
        confirmText: `Move to ${label}`,
        variant: "destructive",
      });
      if (!ok) return;
    }
    void run(async () => {
      const result = await transitionProviderStatuses(providers.map((provider) => provider.id), next);
      if (result.error) return { error: result.error };
      const skipped = result.skipped ? ` ${result.skipped} skipped — they can't move there from their current status.` : "";
      return { message: `Moved ${result.updated ?? 0} to ${label}.${skipped}` };
    });
  }

  function handlePublishPrices() {
    void run(async () => {
      const result = await publishProvidersOffers(providers.map((provider) => provider.id));
      if (result.error) return { error: result.error };
      const skipped = result.skipped ? ` ${plural(result.skipped, "pharmacy", "pharmacies")} skipped — not published yet.` : "";
      return { message: `Published ${plural(result.updated ?? 0, "draft price")}.${skipped}` };
    });
  }

  function handleScrapePrices() {
    void run(async () => {
      const lookup = await getPublishedPricePages(providers.map((provider) => provider.id));
      if (lookup.error) return { error: lookup.error };
      const untracked = lookup.untracked ? ` ${plural(lookup.untracked, "published price")} skipped — entered by hand, not tracked from a product page.` : "";
      if (lookup.pages.length === 0) return { error: `No published price to scrape for the selected pharmacies.${untracked}` };
      const result = await scrapeMatches(lookup.pages, "automaticThenHuman");
      return result.error ? { error: `${result.error}${untracked}` } : { message: `${result.message}${untracked}` };
    }, "Finding published prices…");
  }

  return (
    <BulkActionBar count={providers.length} bulk={bulk} onClear={onClear} emptyHint="Select pharmacies to change their status, or to publish or scrape their prices in bulk.">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" size="sm" variant="outline" disabled={state.busy || options.length === 0} />}>
          <ArrowRightLeft aria-hidden="true" className="size-4" />
          Move to
          <ChevronDown aria-hidden="true" className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Change status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {options.map(({ status, count }) => (
              <DropdownMenuItem
                key={status}
                variant={destructiveProviderStatuses.includes(status) ? "destructive" : "default"}
                onClick={() => handleMove(status, count)}
              >
                {providerStatusLabels[status]}
                <span className="ml-auto pl-4 text-xs text-muted-foreground">{count} of {providers.length}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button type="button" size="sm" variant="outline" disabled={state.busy || publishableDrafts === 0} onClick={handlePublishPrices}>
        <Globe aria-hidden="true" className="size-4" />
        Publish draft prices{publishableDrafts > 0 ? ` (${publishableDrafts})` : ""}
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={state.busy || providers.length === 0} onClick={handleScrapePrices}>
        <RefreshCw aria-hidden="true" className={cn("size-4", state.busy && state.progress && "animate-spin")} />
        Scrape published prices
      </Button>
      {state.busy && state.progress ? (
        <Button type="button" size="sm" variant="ghost" onClick={stop}>
          <Square aria-hidden="true" className="size-3.5" />
          Stop
        </Button>
      ) : null}
      {providers.length > 0 && options.length === 0 ? (
        <span className="text-xs text-muted-foreground">No status change available for these pharmacies with your role.</span>
      ) : null}
    </BulkActionBar>
  );
}
