import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { collectPriceForMatch } from "../src/actions/price-collection/price-collection";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const batchSize = Number(process.env.PRICE_COLLECTION_BATCH_SIZE ?? 10);
const humanAssist = process.argv.includes("--human") || process.env.ED_PRICE_HUMAN_ASSIST === "1";

function isHumanVerificationError(message: string) {
  return /manual verification|human-verification|captcha|verify you are human|checking your browser/i.test(message);
}

async function enqueueDueJobs() {
  const now = new Date();
  const matches = await prisma.productMatch.findMany({
    where: {
      status: "CONFIRMED",
      scrapeEnabled: true,
      nextScrapeAt: { lte: now },
    },
    select: { id: true, nextScrapeAt: true },
    take: batchSize,
    orderBy: { nextScrapeAt: "asc" },
  });

  for (const match of matches) {
    await prisma.priceCollectionJob.create({
      data: {
        productMatchId: match.id,
        scheduledFor: match.nextScrapeAt ?? now,
        humanAssist,
      },
    });
    await prisma.productMatch.update({
      where: { id: match.id },
      data: { lastScrapeStatus: "READY" },
    });
  }
  return matches.length;
}

async function processQueuedJobs() {
  const jobs = await prisma.priceCollectionJob.findMany({
    where: { status: "QUEUED", scheduledFor: { lte: new Date() } },
    orderBy: { scheduledFor: "asc" },
    take: batchSize,
  });

  for (const job of jobs) {
    await prisma.priceCollectionJob.update({
      where: { id: job.id },
      data: { status: "RUNNING", startedAt: new Date() },
    });
    try {
      await collectPriceForMatch(job.productMatchId, { humanAssist: job.humanAssist });
      await prisma.priceCollectionJob.update({
        where: { id: job.id },
        data: { status: "SUCCESS", finishedAt: new Date(), errorMessage: null },
      });
      console.warn(`Collected price for match ${job.productMatchId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Price collection failed.";
      await prisma.priceCollectionJob.update({
        where: { id: job.id },
        data: {
          status: isHumanVerificationError(message) ? "HUMAN_VERIFICATION_REQUIRED" : "FAILED",
          finishedAt: new Date(),
          errorMessage: message,
        },
      });
      console.warn(`Price collection failed for match ${job.productMatchId}: ${message}`);
    }
  }
  return jobs.length;
}

async function main() {
  const enqueued = await enqueueDueJobs();
  const processed = await processQueuedJobs();
  console.warn(`Price collection jobs: ${enqueued} enqueued, ${processed} processed.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
