"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useSyncExternalStore } from "react";

import type { useBulkRun } from "@/hooks/useBulkRun";
import { type BulkScrapeWork, dismissBulkScrape, getServerSnapshot, getSnapshot, mountBulkScrapeScope, startBulkScrape, stopBulkScrape, subscribe } from "@/lib/bulk-scrape-store";

// Ties a bulk toolbar to the tab-wide scrape in `bulk-scrape-store.ts`. A scrape started here keeps
// running when staff leave the page; on coming back, the returned `bulk` shows its progress or
// result again in place of the toolbar's own state. `scrapeRunning` is true for a run started
// anywhere, so every toolbar can keep its scrape buttons off until that run ends.
export function useBulkScrape(bulk: ReturnType<typeof useBulkRun>, onClear: () => void) {
  const scope = usePathname();
  const scrape = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { run, dismiss } = bulk;

  useEffect(() => mountBulkScrapeScope(scope), [scope]);

  const startScrape = useCallback(async (work: BulkScrapeWork, progress: string) => {
    dismiss();
    const result = await startBulkScrape(scope, work, progress);
    if (result && !result.error) onClear();
  }, [dismiss, onClear, scope]);
  // A result left over from a scrape would hide the toolbar's next action, so that action clears it.
  const runOther = useCallback<typeof run>((work, progress) => {
    dismissBulkScrape();
    return run(work, progress);
  }, [run]);

  const showsScrape = scrape.scope === scope && (scrape.running || scrape.result !== null);
  const state = showsScrape
    ? { busy: scrape.running, progress: scrape.progress, message: scrape.result?.message ?? null, error: scrape.result?.error ?? null }
    : bulk.state;

  return {
    bulk: { ...bulk, state, run: runOther, dismiss: showsScrape ? dismissBulkScrape : dismiss },
    startScrape,
    stop: stopBulkScrape,
    scrapeRunning: scrape.running,
  };
}
