/*
  Warnings:

  - The `ProductCategory` enum and `ProductVariant.category` column are removed.
  - The values [TIRZEPATIDE,SEMAGLUTIDE] are removed from the `Ingredient` enum.

  Client reverted the multi-vertical platform pivot (docs/milestones/00-platform-strategy.md,
  2026-09-16) back to ED-only scope on 2026-09-18 — see docs/current-tasks.md. Deletes the 3 seeded
  weight-loss ProductVariant rows (Mounjaro 5mg/10mg, Wegovy 1mg) first; verified live they have zero
  dependent Offer rows, so no cascading price/discount/evidence data is lost.
*/

-- DeleteData
DELETE FROM "ProductVariant" WHERE "category" = 'WEIGHT_LOSS';

-- DropIndex
DROP INDEX "ProductVariant_category_idx";

-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "category";

-- DropEnum
DROP TYPE "ProductCategory";

-- AlterEnum
CREATE TYPE "Ingredient_new" AS ENUM ('SILDENAFIL', 'TADALAFIL');
ALTER TABLE "ProductVariant" ALTER COLUMN "ingredient" TYPE "Ingredient_new" USING ("ingredient"::text::"Ingredient_new");
ALTER TYPE "Ingredient" RENAME TO "Ingredient_old";
ALTER TYPE "Ingredient_new" RENAME TO "Ingredient";
DROP TYPE "Ingredient_old";
