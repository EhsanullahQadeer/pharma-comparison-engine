import "dotenv/config";

import { prisma } from "@/lib/prisma";

import { runDueCollection } from "./lib/price-collection-queue";

// One-shot run of the price-collection queue (development / manual catch-up). On the VPS the
// long-running `price-collection:worker` does this every minute instead.
const batchSize = Number(process.env.PRICE_COLLECTION_BATCH_SIZE ?? 10);
const humanAssist = process.argv.includes("--human") || process.env.ED_PRICE_HUMAN_ASSIST === "1";

runDueCollection({ batchSize, humanAssist })
  .then(({ recovered, failedStale, enqueued, processed }) => {
    console.warn(`Price collection jobs: ${recovered} recovered, ${failedStale} failed after worker loss, ${enqueued} enqueued, ${processed} processed.`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
