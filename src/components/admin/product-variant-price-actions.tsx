"use client";

import { BarChart3, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/common/button";
import Link from "@/components/Link";
import { useMutate } from "@/hooks/useMutate";
import { cn } from "@/lib/utils";

export function ProductVariantPriceActions({ id }: { id: string }) {
  const [humanAssist, setHumanAssist] = useState(false);
  const { mutate, isPending, data, error: requestError } = useMutate("scrapePricesForVariant");
  const error = data?.error ?? requestError?.message;
  const message = data?.result ? `${data.result.scraped}/${data.result.attempted} scraped` : undefined;

  function handleScrape(assisted: boolean) {
    setHumanAssist(assisted);
    mutate(id, assisted);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-1">
        <Button type="button" size="icon-sm" variant="outline" disabled={isPending} onClick={() => handleScrape(false)}>
          <RefreshCw aria-hidden="true" className={cn("size-4", isPending && "animate-spin")} />
          <span className="sr-only">Scrape prices for this variant</span>
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => handleScrape(true)}>
          Human scrape
        </Button>
        <Link href={`/admin/catalogue/product-variants/${id}/prices`} className={buttonVariants({ size: "icon-sm", variant: "outline" })}>
          <BarChart3 aria-hidden="true" className="size-4" />
          <span className="sr-only">View prices for this variant</span>
        </Link>
      </div>
      {isPending && humanAssist ? <p role="status" className="max-w-64 text-right text-xs text-muted-foreground whitespace-normal!">Complete any verification in the Chrome scraping window on the server computer. Scraping resumes automatically; keep the window open.</p> : null}
      {!isPending && message ? <span className="text-xs text-muted-foreground whitespace-normal!">{message}</span> : null}
      {!isPending && error ? <span className="max-w-48 text-right text-xs text-destructive whitespace-normal!">{error}</span> : null}
    </div>
  );
}
