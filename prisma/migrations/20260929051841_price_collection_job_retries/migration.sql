-- AlterTable
ALTER TABLE "PriceCollectionJob" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "leaseExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PriceCollectionJob_status_leaseExpiresAt_idx" ON "PriceCollectionJob"("status", "leaseExpiresAt");
