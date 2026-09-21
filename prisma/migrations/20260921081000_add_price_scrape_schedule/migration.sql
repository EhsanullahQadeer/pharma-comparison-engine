-- CreateEnum
CREATE TYPE "PriceScrapeCadence" AS ENUM ('MANUAL', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "PriceScrapeStatus" AS ENUM ('NOT_CONFIGURED', 'READY', 'SCRAPED', 'NEEDS_REVIEW', 'HUMAN_VERIFICATION_REQUIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "PriceCollectionJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'HUMAN_VERIFICATION_REQUIRED');

-- AlterTable
ALTER TABLE "ProductMatch"
  ADD COLUMN "scrapeEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "scrapeCadence" "PriceScrapeCadence" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "nextScrapeAt" TIMESTAMP(3),
  ADD COLUMN "lastScrapedAt" TIMESTAMP(3),
  ADD COLUMN "lastScrapeStatus" "PriceScrapeStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  ADD COLUMN "lastScrapeError" TEXT,
  ADD COLUMN "requiresHumanAssist" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PriceCollectionJob" (
  "id" TEXT NOT NULL,
  "productMatchId" TEXT NOT NULL,
  "status" "PriceCollectionJobStatus" NOT NULL DEFAULT 'QUEUED',
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "humanAssist" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PriceCollectionJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductMatch_scrapeEnabled_nextScrapeAt_idx" ON "ProductMatch"("scrapeEnabled", "nextScrapeAt");

-- CreateIndex
CREATE INDEX "PriceCollectionJob_status_scheduledFor_idx" ON "PriceCollectionJob"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "PriceCollectionJob_productMatchId_idx" ON "PriceCollectionJob"("productMatchId");

-- AddForeignKey
ALTER TABLE "PriceCollectionJob" ADD CONSTRAINT "PriceCollectionJob_productMatchId_fkey" FOREIGN KEY ("productMatchId") REFERENCES "ProductMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
