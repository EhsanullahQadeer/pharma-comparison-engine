"use client";

import { useCallback, useRef } from "react";

import { runPriceCollectionForMatch } from "@/actions/price-collection/price-collection";
import type { BulkRunResult } from "@/hooks/useBulkRun";
import { useRouter } from "@/hooks/useRouter";
import { visibleBrowserGaveUp, worthVisibleBrowserRetry } from "@/lib/price-collection/scrape-escalation";
import type { BulkScrapeMode, BulkScrapePage } from "@/types/pricing";

// Scrapes a list of tracked product pages one at a time, like the scheduled runner — pharmacy sites
// are fetched politely, and staff can stop between pages. "human" opens each page in the visible
// Chrome window, where a person completes any security check; "automaticThenHuman" only goes there
// for a page the automatic check (plain request, then background browser) could not price. Pass the
// result to useBulkRun's `run`; `setProgress` is that hook's.
export function useBulkScrape(setProgress: (progress: string) => void) {
  const router = useRouter();
  const stopRequested = useRef(false);

  const scrapeMatches = useCallback(async (pages: BulkScrapePage[], mode: BulkScrapeMode): Promise<BulkRunResult> => {
    stopRequested.current = false;
    let scraped = 0;
    let viaVisibleBrowser = 0;
    const failures: string[] = [];
    // Pharmacies whose security check went unanswered in this run: their other pages skip the window.
    const unansweredProviders = new Set<string>();
    for (const [index, page] of pages.entries()) {
      if (stopRequested.current) break;
      const position = `${index + 1} of ${pages.length}`;
      setProgress(`Scraping ${position}…`);
      let result = await runPriceCollectionForMatch(page.matchId, mode === "human");
      const retry = mode === "automaticThenHuman" && result.error && worthVisibleBrowserRetry(result.error) && !unansweredProviders.has(page.providerId ?? "") && !stopRequested.current;
      if (retry) {
        setProgress(`Scraping ${position} — the automatic check failed, trying the Chrome window. If it shows a security check, complete it there.`);
        result = await runPriceCollectionForMatch(page.matchId, true);
        if (result.error && page.providerId && visibleBrowserGaveUp(result.error)) unansweredProviders.add(page.providerId);
        if (!result.error) viaVisibleBrowser += 1;
      }
      if (result.error) failures.push(result.error);
      else scraped += 1;
    }
    router.refresh();
    const stopped = stopRequested.current ? " Stopped early." : "";
    const assisted = viaVisibleBrowser > 0 ? ` (${viaVisibleBrowser} through the Chrome window)` : "";
    if (failures.length === 0) return { message: `Scraped ${scraped} price${scraped === 1 ? "" : "s"}${assisted}.${stopped}` };
    return { error: `Scraped ${scraped}${assisted}, ${failures.length} failed (first error: ${failures[0]}).${stopped}` };
  }, [router, setProgress]);
  const stop = useCallback(() => { stopRequested.current = true; }, []);

  return { scrapeMatches, stop };
}
