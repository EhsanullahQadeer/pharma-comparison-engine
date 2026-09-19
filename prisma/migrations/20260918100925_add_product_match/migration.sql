-- CreateEnum
CREATE TYPE "ProductMatchStatus" AS ENUM ('NEW', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProductMatchConfidence" AS ENUM ('HIGH', 'MEDIUM');

-- CreateTable
CREATE TABLE "ProductMatch" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "candidateUrl" TEXT NOT NULL,
    "matchedIngredient" "Ingredient" NOT NULL,
    "matchedTokens" TEXT[],
    "confidence" "ProductMatchConfidence" NOT NULL,
    "status" "ProductMatchStatus" NOT NULL DEFAULT 'NEW',
    "productVariantId" TEXT,
    "offerId" TEXT,
    "reviewedByStaffId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductMatch_offerId_key" ON "ProductMatch"("offerId");

-- CreateIndex
CREATE INDEX "ProductMatch_status_idx" ON "ProductMatch"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMatch_providerId_candidateUrl_key" ON "ProductMatch"("providerId", "candidateUrl");

-- AddForeignKey
ALTER TABLE "ProductMatch" ADD CONSTRAINT "ProductMatch_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMatch" ADD CONSTRAINT "ProductMatch_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMatch" ADD CONSTRAINT "ProductMatch_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMatch" ADD CONSTRAINT "ProductMatch_reviewedByStaffId_fkey" FOREIGN KEY ("reviewedByStaffId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
