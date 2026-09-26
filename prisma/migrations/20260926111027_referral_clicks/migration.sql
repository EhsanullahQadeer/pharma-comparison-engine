/*
  Warnings:

  - You are about to drop the `Referral` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ReferralPlacement" AS ENUM ('COMPARE', 'INGREDIENT_PRICES', 'PHARMACY_PROFILE', 'REPEAT_COSTS');

-- DropForeignKey
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_offerId_fkey";

-- DropTable
DROP TABLE "Referral";

-- CreateTable
CREATE TABLE "ReferralClick" (
    "id" TEXT NOT NULL,
    "offerId" TEXT,
    "providerId" TEXT NOT NULL,
    "productVariantId" TEXT,
    "placement" "ReferralPlacement",
    "rankPosition" INTEGER,
    "isLikelyBot" BOOLEAN NOT NULL DEFAULT false,
    "visitorHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReferralClick_createdAt_idx" ON "ReferralClick"("createdAt");

-- CreateIndex
CREATE INDEX "ReferralClick_providerId_createdAt_idx" ON "ReferralClick"("providerId", "createdAt");

-- CreateIndex
CREATE INDEX "ReferralClick_visitorHash_createdAt_idx" ON "ReferralClick"("visitorHash", "createdAt");

-- AddForeignKey
ALTER TABLE "ReferralClick" ADD CONSTRAINT "ReferralClick_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralClick" ADD CONSTRAINT "ReferralClick_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralClick" ADD CONSTRAINT "ReferralClick_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
