"use client";

import { BarChart3, RefreshCw } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button, buttonVariants } from "@/components/common/button";
import Link from "@/components/Link";
import { cn } from "@/lib/utils";
import { getVariantScrapeSnapshot, idleVariantScrape, startVariantScrape, subscribeVariantScrape } from "@/lib/variant-scrape-store";

// Row buttons only — the live progress/result lives in ProductVariantScrapeProgress above the
// table (variant-scrape-store.ts connects the two), so a long log never stretches a table row.
export function ProductVariantPriceActions({ id, label }: { id: string; label: string }) {
  const { status, variantId } = useSyncExternalStore(subscribeVariantScrape, getVariantScrapeSnapshot, () => idleVariantScrape);
  const isRunning = status === "running";
  const isThisRow = isRunning && variantId === id;

  return (
    <div className="flex justify-end gap-1">
      <Button type="button" size="icon-sm" variant="outline" disabled={isRunning} onClick={() => startVariantScrape(id, label, false)}>
        <RefreshCw aria-hidden="true" className={cn("size-4", isThisRow && "animate-spin")} />
        <span className="sr-only">Scrape prices for this variant</span>
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={isRunning} onClick={() => startVariantScrape(id, label, true)}>
        Human scrape
      </Button>
      <Link href={`/admin/catalogue/product-variants/${id}/prices`} className={buttonVariants({ size: "icon-sm", variant: "outline" })}>
        <BarChart3 aria-hidden="true" className="size-4" />
        <span className="sr-only">View prices for this variant</span>
      </Link>
    </div>
  );
}
