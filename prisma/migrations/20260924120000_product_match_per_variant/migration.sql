-- One ProductMatch per page per exact variant (was one per page), so a page listing several
-- strengths/pack sizes can carry a confirmed match and linked offer for each.

-- DropIndex
DROP INDEX "ProductMatch_providerId_candidateUrl_key";

-- CreateIndex
CREATE UNIQUE INDEX "ProductMatch_providerId_candidateUrl_productVariantId_key" ON "ProductMatch"("providerId", "candidateUrl", "productVariantId");
