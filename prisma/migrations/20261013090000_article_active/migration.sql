-- Lets staff switch a published article off the public site without unpublishing it.
ALTER TABLE "Article" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
