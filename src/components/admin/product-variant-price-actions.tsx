"use client";

import { BarChart3, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";

import { scrapePricesForVariant } from "@/actions/product-variants/product-variants";
import { Button, buttonVariants } from "@/components/common/button";
import Link from "@/components/Link";

export function ProductVariantPriceActions({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  function handleScrape() {
    setError(undefined);
    setMessage(undefined);
    startTransition(async () => {
      const state = await scrapePricesForVariant(id);
      if (state.error) {
        setError(state.error);
        return;
      }
      if (state.result) setMessage(`${state.result.scraped}/${state.result.attempted} scraped`);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-1">
        <Button type="button" size="icon-sm" variant="outline" disabled={isPending} onClick={handleScrape}>
          <RefreshCw aria-hidden="true" className="size-4" />
          <span className="sr-only">Scrape prices for this variant</span>
        </Button>
        <Link href={`/admin/catalogue/product-variants/${id}/prices`} className={buttonVariants({ size: "icon-sm", variant: "outline" })}>
          <BarChart3 aria-hidden="true" className="size-4" />
          <span className="sr-only">View prices for this variant</span>
        </Link>
      </div>
      {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
      {error ? <span className="max-w-48 text-right text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
