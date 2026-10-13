-- Anonymous marketing detail on each outbound click: approximate area, device, browser, the page
-- clicked from and the price shown. No IP address or raw user agent is stored.
CREATE TYPE "ClickDevice" AS ENUM ('DESKTOP', 'MOBILE', 'TABLET');

ALTER TABLE "ReferralClick"
  ADD COLUMN "country" TEXT,
  ADD COLUMN "region" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "deviceType" "ClickDevice",
  ADD COLUMN "browser" TEXT,
  ADD COLUMN "os" TEXT,
  ADD COLUMN "sourcePath" TEXT,
  ADD COLUMN "totalPricePence" INTEGER;
