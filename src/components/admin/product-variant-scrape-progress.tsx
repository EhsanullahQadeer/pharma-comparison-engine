"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore } from "react";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/card";
import { cn } from "@/lib/utils";
import {
  dismissVariantScrape,
  getVariantScrapeSnapshot,
  idleVariantScrape,
  subscribeVariantScrape,
  type VariantScrapeSnapshot,
} from "@/lib/variant-scrape-store";

const statusBadges = {
  running: { label: "Running", variant: "secondary" },
  done: { label: "Finished", variant: "outline" },
  error: { label: "Stopped", variant: "destructive" },
} satisfies Record<Exclude<VariantScrapeSnapshot["status"], "idle">, { label: string; variant: "secondary" | "outline" | "destructive" }>;

// One progress panel above the product-variants table for whichever row's scrape is running (see
// variant-scrape-store.ts). Hidden until a scrape starts; stays after it ends so the full log and
// result can be read, until dismissed.
export function ProductVariantScrapeProgress() {
  const { status, label, humanAssist, log, result, error } = useSyncExternalStore(subscribeVariantScrape, getVariantScrapeSnapshot, () => idleVariantScrape);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = logRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [log]);

  if (status === "idle") return null;
  const badge = statusBadges[status];
  const isRunning = status === "running";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
          {isRunning ? <Loader2 aria-hidden="true" className="size-4 animate-spin text-muted-foreground" /> : null}
          {humanAssist ? "Human scrape" : "Price scrape"}: {label}
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </CardTitle>
        {isRunning && humanAssist ? <CardDescription>Complete any verification in the Chrome scraping window on the server computer. Scraping resumes automatically; keep the window open.</CardDescription> : null}
        {!isRunning && (
          <CardAction>
            <Button type="button" size="icon-sm" variant="ghost" onClick={dismissVariantScrape}>
              <X aria-hidden="true" className="size-4" />
              <span className="sr-only">Dismiss scrape progress</span>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div ref={logRef} role="status" aria-live="polite" className="max-h-56 space-y-0.5 overflow-y-auto rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
          {log.length === 0 && <p>Starting…</p>}
          {log.map((line, index) => (
            <p key={index} className={cn("break-words", isRunning && index === log.length - 1 && "text-foreground")}>{line}</p>
          ))}
        </div>
        {result ? <p className="text-sm">{result.scraped} of {result.attempted} pharmacies scraped, {result.failed} failed.</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
