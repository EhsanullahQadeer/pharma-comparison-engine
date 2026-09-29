import "dotenv/config";

import cron from "node-cron";

import { prisma } from "@/lib/prisma";

import { runDueCollection } from "./lib/price-collection-queue";

// Long-running price-collection worker for the VPS (milestone 5). Run exactly one instance as its
// own supervised process (see deploy/price-collection-worker.service), never from the web app.
// Each one-minute tick only checks the database for due work; it does not scrape every provider.
const batchSize = Number(process.env.PRICE_COLLECTION_BATCH_SIZE ?? 10);
const humanAssist = process.argv.includes("--human") || process.env.ED_PRICE_HUMAN_ASSIST === "1";

let stopping = false;
let current: Promise<void> | null = null;

function tick() {
  // The startup run and a cron tick can meet; the second simply waits for the next minute.
  if (current || stopping) return current ?? Promise.resolve();
  current = runDueCollection({ batchSize, humanAssist, shouldStop: () => stopping })
    .then(({ recovered, failedStale, enqueued, processed }) => {
      console.warn(`[${new Date().toISOString()}] heartbeat: ${recovered} recovered, ${failedStale} failed after worker loss, ${enqueued} enqueued, ${processed} processed.`);
    })
    .catch((error) => console.error(`[${new Date().toISOString()}] tick failed:`, error))
    .finally(() => { current = null; });
  return current;
}

const task = cron.schedule("* * * * *", tick, { name: "price-collection", timezone: "UTC", noOverlap: true });

async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  console.warn(`${signal} received; finishing the current page before exiting.`);
  await task.stop();
  await current;
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

console.warn(`Price collection worker started (batch ${batchSize}${humanAssist ? ", human-assisted" : ""}).`);
// Reconcile overdue work straight away rather than waiting for the first minute boundary.
void tick();
