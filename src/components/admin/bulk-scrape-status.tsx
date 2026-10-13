"use client";

import { RefreshCw, Square, X } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore } from "react";

import { Button } from "@/components/common/button";
import Link from "@/components/Link";
import { useRouter } from "@/hooks/useRouter";
import { dismissBulkScrape, getServerSnapshot, getSnapshot, stopBulkScrape, subscribe } from "@/lib/bulk-scrape-store";
import { cn } from "@/lib/utils";

// Single host for the tab's bulk scrape (see `bulk-scrape-store.ts`), mounted once in the admin
// shell. Shows the run's progress or result on every page except the one that started it, whose own
// toolbar already does; refreshes the page on screen when a run ends; and warns before a reload or
// closed tab, which is the one thing that still ends a run early.
export function BulkScrapeStatus() {
  const run = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const router = useRouter();
  const wasRunning = useRef(false);

  useEffect(() => {
    if (wasRunning.current && !run.running) router.refresh();
    wasRunning.current = run.running;
  }, [run.running, router]);

  useEffect(() => {
    if (!run.running) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [run.running]);

  if (run.ownerMounted || (!run.running && !run.result)) return null;

  return (
    <div className="mx-4 mb-2 flex flex-col gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2 sm:flex-row sm:flex-wrap sm:items-center">
      <RefreshCw aria-hidden="true" className={cn("size-4 shrink-0 text-muted-foreground", run.running && "animate-spin")} />
      <p role="status" className="min-w-0 text-sm">
        {run.progress ?? run.result?.message}
      </p>
      {run.result?.error ? <p role="alert" className="min-w-0 text-sm text-destructive">{run.result.error}</p> : null}
      <div className="flex items-center gap-2 sm:ml-auto">
        {run.scope ? <Link href={run.scope} className="text-sm underline hover:no-underline">Open the page it was started from</Link> : null}
        {run.running ? (
          <Button type="button" size="sm" variant="ghost" onClick={stopBulkScrape}>
            <Square aria-hidden="true" className="size-3.5" />
            Stop
          </Button>
        ) : (
          <Button type="button" size="sm" variant="ghost" onClick={dismissBulkScrape}>
            <X aria-hidden="true" className="size-4" />
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}
