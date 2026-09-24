"use client";

import { BarChart3, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/common/button";
import Link from "@/components/Link";
import { cn } from "@/lib/utils";

type ScrapeResult = { attempted: number; scraped: number; failed: number };

// Drives the live progress panel below via the SSE endpoint at
// app/api/product-variants/[id]/scrape-stream instead of the plain scrapePricesForVariant server
// action — a server action can only return once, so it can't narrate what it's doing while a scrape
// (which can run for minutes in human-assist mode) is still in progress.
export function ProductVariantPriceActions({ id }: { id: string }) {
  const [isPending, setIsPending] = useState(false);
  const [humanAssist, setHumanAssist] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<ScrapeResult>();
  const [error, setError] = useState<string>();
  const eventSourceRef = useRef<EventSource | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [log]);

  useEffect(() => {
    return () => eventSourceRef.current?.close();
  }, []);

  function handleScrape(assisted: boolean) {
    eventSourceRef.current?.close();
    setHumanAssist(assisted);
    setIsPending(true);
    setLog([]);
    setResult(undefined);
    setError(undefined);

    const source = new EventSource(`/api/product-variants/${id}/scrape-stream?assisted=${assisted}`);
    eventSourceRef.current = source;

    source.addEventListener("progress", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { message: string };
      setLog((prev) => [...prev, data.message]);
    });
    source.addEventListener("done", (event) => {
      setResult(JSON.parse((event as MessageEvent).data) as ScrapeResult);
      setIsPending(false);
      source.close();
    });
    source.addEventListener("scrape-error", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { message: string };
      setError(data.message);
      setIsPending(false);
      source.close();
    });
    source.onerror = () => {
      setError((prev) => prev ?? "Lost connection to the server while scraping.");
      setIsPending(false);
      source.close();
    };
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
      {isPending && humanAssist ? <p className="max-w-64 text-right text-xs text-muted-foreground whitespace-normal!">Complete any verification in the Chrome scraping window on the server computer. Scraping resumes automatically; keep the window open.</p> : null}
      {isPending && log.length > 0 ? (
        <div role="status" aria-live="polite" className="max-h-28 w-72 space-y-0.5 overflow-y-auto rounded-md border border-border bg-muted/30 p-1.5 text-left text-xs text-muted-foreground">
          {log.map((line, index) => (
            <p key={index} className={cn("truncate", index === log.length - 1 && "text-foreground")}>{line}</p>
          ))}
          <div ref={logEndRef} />
        </div>
      ) : null}
      {!isPending && result ? <span className="text-xs text-muted-foreground whitespace-normal!">{result.scraped}/{result.attempted} scraped</span> : null}
      {!isPending && error ? <span className="max-w-48 text-right text-xs text-destructive whitespace-normal!">{error}</span> : null}
    </div>
  );
}
