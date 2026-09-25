// Global store for the product-variants page's price scrape, mirroring confirm-store.ts's pattern —
// each row's ProductVariantPriceActions starts a scrape, and the single ProductVariantScrapeProgress
// panel above the table renders it, with no context/provider linking the two. It owns the
// EventSource to app/api/product-variants/[id]/scrape-stream (a server action can only return
// once, so it can't narrate a scrape that can wait minutes for a security check). One scrape at a
// time: the server only allows one visible Chrome window anyway, and one panel shows one run.

export type VariantScrapeResult = { attempted: number; scraped: number; failed: number };

export interface VariantScrapeSnapshot {
  status: "idle" | "running" | "done" | "error";
  variantId?: string;
  label?: string;
  log: string[];
  result?: VariantScrapeResult;
  error?: string;
}

export const idleVariantScrape: VariantScrapeSnapshot = { status: "idle", log: [] };

let snapshot = idleVariantScrape;
let eventSource: EventSource | null = null;
const listeners = new Set<() => void>();

function setSnapshot(next: Partial<VariantScrapeSnapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

function finish(next: Pick<VariantScrapeSnapshot, "status" | "result" | "error">) {
  eventSource?.close();
  eventSource = null;
  setSnapshot(next);
}

export function startVariantScrape(variantId: string, label: string) {
  if (snapshot.status === "running") return;
  snapshot = { status: "running", variantId, label, log: [] };
  listeners.forEach((listener) => listener());

  const source = new EventSource(`/api/product-variants/${variantId}/scrape-stream`);
  eventSource = source;
  source.addEventListener("progress", (event) => {
    const { message } = JSON.parse((event as MessageEvent).data) as { message: string };
    setSnapshot({ log: [...snapshot.log, message] });
  });
  source.addEventListener("done", (event) => {
    finish({ status: "done", result: JSON.parse((event as MessageEvent).data) as VariantScrapeResult });
  });
  // Named "scrape-error", not "error": EventSource treats an SSE event literally named "error" as a
  // connection failure, so expected scrape failures would be indistinguishable from a network drop.
  source.addEventListener("scrape-error", (event) => {
    finish({ status: "error", error: (JSON.parse((event as MessageEvent).data) as { message: string }).message });
  });
  source.onerror = () => {
    if (eventSource === source) finish({ status: "error", error: "Lost connection to the server while scraping." });
  };
}

export function dismissVariantScrape() {
  if (snapshot.status === "running") return;
  snapshot = idleVariantScrape;
  listeners.forEach((listener) => listener());
}

export function getVariantScrapeSnapshot(): VariantScrapeSnapshot {
  return snapshot;
}

export function subscribeVariantScrape(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
