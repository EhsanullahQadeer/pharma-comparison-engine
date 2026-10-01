-- CreateEnum
CREATE TYPE "ScrapeReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'DISMISSED');

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "siteOffersCheckedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Discount" ADD COLUMN     "evidenceText" TEXT,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "providerId" TEXT,
ADD COLUMN     "scraped" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "status" "ScrapeReviewStatus" NOT NULL DEFAULT 'APPROVED',
ALTER COLUMN "offerId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "DeliveryPolicy" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "standardFeePence" INTEGER NOT NULL,
    "freeOverPence" INTEGER,
    "evidenceText" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "status" "ScrapeReviewStatus" NOT NULL DEFAULT 'PENDING',
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryPolicy_providerId_status_idx" ON "DeliveryPolicy"("providerId", "status");

-- CreateIndex
CREATE INDEX "Discount_offerId_idx" ON "Discount"("offerId");

-- CreateIndex
CREATE INDEX "Discount_providerId_idx" ON "Discount"("providerId");

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryPolicy" ADD CONSTRAINT "DeliveryPolicy_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
