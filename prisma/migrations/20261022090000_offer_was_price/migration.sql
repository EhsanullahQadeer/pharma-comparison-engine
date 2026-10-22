-- Was/now sale prices: the pharmacy's own crossed-out "was" medicine price, when its page shows one.
ALTER TABLE "Offer" ADD COLUMN "wasPricePence" INTEGER;

ALTER TABLE "PriceHistory" ADD COLUMN "wasPricePence" INTEGER;
