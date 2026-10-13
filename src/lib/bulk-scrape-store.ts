// Global bulk-scrape store, mirroring `confirm-store.ts`'s pattern. The run lives here rather than
// in the toolbar that started it, so it keeps its progress, result and Stop button when staff move
// to another admin page, and a second run can't be started on top of it.

import { runPriceCollectionForMatch } from "@/actions/price-collection/price-collection";
import { visibleBrowserGaveUp, worthVisibleBrowserRetry } from "@/lib/price-collection/scrape-escalation";
import type { BulkScrapeMode, BulkScrapePage, BulkScrapeResult, BulkScrapeRun } from "@/types/pricing";

export type BulkScrapeWork = (scrapeMatches: (pages: BulkScrapePage[], mode: BulkScrapeMode) => Promise<BulkScrapeResult>) => Promise<BulkScrapeResult>;

const idle: BulkScrapeRun = { scope: null, running: false, progress: null, result: null, ownerMounted: false };

let snapshot = idle;
let stopRequested = false;
const mountedScopes = new Map<string, number>();
const listeners = new Set<() => void>();

function update(patch: Partial<BulkScrapeRun>) {
  const next = { ...snapshot, ...patch };
  next.ownerMounted = next.scope !== null && mountedScopes.has(next.scope);
  snapshot = next;
  listeners.forEach((listener) => listener());
}

// Scrapes a list of tracked product pages one at a time, like the scheduled runner — pharmacy sites
// are fetched politely, and staff can stop between pages. "human" opens each page in the visible
// Chrome window, where a person completes any security check; "automaticThenHuman" only goes there
// for a page the automatic check (plain request, then background browser) could not price.
async function scrapeMatches(pages: BulkScrapePage[], mode: BulkScrapeMode): Promise<BulkScrapeResult> {
  let scraped = 0;
  let viaVisibleBrowser = 0;
  const failures: string[] = [];
  // Pharmacies whose security check went unanswered in this run: their other pages skip the window.
  const unansweredProviders = new Set<string>();
  for (const [index, page] of pages.entries()) {
    if (stopRequested) break;
    const position = `${index + 1} of ${pages.length}`;
    update({ progress: `Scraping ${position}…` });
    let result = await runPriceCollectionForMatch(page.matchId, mode === "human");
    const retry = mode === "automaticThenHuman" && result.error && worthVisibleBrowserRetry(result.error) && !unansweredProviders.has(page.providerId ?? "") && !stopRequested;
    if (retry) {
      update({ progress: `Scraping ${position} — the automatic check failed, trying the Chrome window. If it shows a security check, complete it there.` });
      result = await runPriceCollectionForMatch(page.matchId, true);
      if (result.error && page.providerId && visibleBrowserGaveUp(result.error)) unansweredProviders.add(page.providerId);
      if (!result.error) viaVisibleBrowser += 1;
    }
    if (result.error) failures.push(result.error);
    else scraped += 1;
  }
  const stopped = stopRequested ? " Stopped early." : "";
  const assisted = viaVisibleBrowser > 0 ? ` (${viaVisibleBrowser} through the Chrome window)` : "";
  if (failures.length === 0) return { message: `Scraped ${scraped} price${scraped === 1 ? "" : "s"}${assisted}.${stopped}` };
  return { error: `Scraped ${scraped}${assisted}, ${failures.length} failed (first error: ${failures[0]}).${stopped}` };
}

// Starts the tab's bulk scrape for the page at `scope`. Resolves to null, without starting anything,
// when one is already running.
export async function startBulkScrape(scope: string, work: BulkScrapeWork, progress: string): Promise<BulkScrapeResult | null> {
  if (snapshot.running) return null;
  stopRequested = false;
  update({ scope, running: true, progress, result: null });
  let result: BulkScrapeResult;
  try {
    result = await work(scrapeMatches);
  } catch (error) {
    // A dropped connection rejects the server call; without this the run would read as busy forever.
    result = { error: error instanceof Error ? error.message : "The scrape stopped unexpectedly." };
  }
  update({ running: false, progress: null, result });
  return result;
}

export function stopBulkScrape() {
  stopRequested = true;
}

export function dismissBulkScrape() {
  if (!snapshot.running && snapshot.result) update({ scope: null, result: null });
}

// Called by a scrape toolbar while it is on screen, so the store knows whether the page that owns
// the run is showing it.
export function mountBulkScrapeScope(scope: string) {
  mountedScopes.set(scope, (mountedScopes.get(scope) ?? 0) + 1);
  if (snapshot.scope === scope) update({});
  return () => {
    const remaining = (mountedScopes.get(scope) ?? 1) - 1;
    if (remaining > 0) mountedScopes.set(scope, remaining);
    else mountedScopes.delete(scope);
    if (snapshot.scope === scope) update({});
  };
}

export function getSnapshot(): BulkScrapeRun {
  return snapshot;
}

export function getServerSnapshot(): BulkScrapeRun {
  return idle;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
