-- Phone price-grid layout test: which layout a click came from, and daily phone page views per
-- layout. No visitor identifier and nothing stored on the visitor's device.
CREATE TYPE "GridLayout" AS ENUM ('COMPACT', 'SWIPE');

ALTER TABLE "ReferralClick" ADD COLUMN "gridLayout" "GridLayout";

CREATE TABLE "GridLayoutView" (
    "day" DATE NOT NULL,
    "layout" "GridLayout" NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GridLayoutView_pkey" PRIMARY KEY ("day","layout")
);
