import { getLinkedProviderIds } from "@/actions/referrals/outbound-links";
import { OfferCard } from "@/components/ed/offer-card";
import { OfferTable } from "@/components/ed/offer-table";
import type { ReferralPlacement } from "@/generated/prisma/client";
import { maxSortValue, splitRankedOffers } from "@/lib/comparison";
import type { ComparisonSort, PublicOffer } from "@/types/comparison";

const sortHeadings: Record<ComparisonSort, string> = {
  tablet: "Ranked by price per tablet",
  total: "Ranked by total price",
};

type ResultsContext = "comparison" | "profile";
type ResultsLayout = "cards" | "table";

// A single pharmacy's own products aren't competing, so its profile lists them without ranks.
const rankedHeading: Record<ResultsContext, (sort: ComparisonSort) => string> = {
  comparison: (sort) => sortHeadings[sort],
  profile: () => "Current prices",
};

// Ranked list (in stock, by price) followed by out-of-stock offers, each explained. Order is
// decided before links are looked up — whether a pharmacy is linked never changes its place.
export async function OfferResults({ offers, sort, now, placement, context = "comparison", limit, layout = "cards" }: {
  offers: PublicOffer[];
  // Where the outbound click is reported as coming from (admin click analytics only).
  placement: ReferralPlacement;
  sort: ComparisonSort;
  now: Date;
  context?: ResultsContext;
  limit?: number;
  layout?: ResultsLayout;
}) {
  const split = splitRankedOffers(offers, sort);
  const ranked = split.ranked.slice(0, limit);
  const other = limit ? [] : split.other;
  const max = maxSortValue([...ranked, ...other], sort);
  const ranks = context === "comparison";
  // "Lowest price" only means something when several offers are actually competing.
  const bestIndex = ranks && ranked.length > 1 ? 0 : -1;
  const linked = await getLinkedProviderIds();

  // Table layout: ranked and "also listed" rows share one table, split by a divider row.
  if (layout === "table") {
    if (ranked.length + other.length === 0) return null;
    const heading = rankedHeading[context](sort);
    return (
      <section aria-labelledby="ranked-offers-heading" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="ranked-offers-heading" className="text-2xl font-semibold">{heading}</h2>
          <p className="text-sm text-muted-foreground">
            {ranked.length} current price{ranked.length === 1 ? "" : "s"}{other.length > 0 && ` · ${other.length} also listed`}
          </p>
        </div>
        <div className="mt-7">
          <OfferTable ranked={ranked} other={other} now={now} sort={sort} placement={placement} showRank={ranks} showOffers={ranks} bestId={ranked[bestIndex]?.id} label={heading} linkedProviderIds={linked} />
        </div>
      </section>
    );
  }

  return (
    <>
      {ranked.length > 0 && (
        <section aria-labelledby="ranked-offers-heading" className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="ranked-offers-heading" className="text-2xl font-semibold">{rankedHeading[context](sort)}</h2>
            <p className="text-sm text-muted-foreground">{ranked.length} current price{ranked.length === 1 ? "" : "s"}</p>
          </div>
          <ol className="mt-7 space-y-6">
            {ranked.map((offer, index) => (
              <OfferCard key={offer.id} offer={offer} now={now} placement={placement} linked={linked.has(offer.providerId)} rank={ranks ? index + 1 : undefined} best={index === bestIndex} max={max} sort={sort} index={index} context={context} />
            ))}
          </ol>
        </section>
      )}
      {other.length > 0 && (
        <section aria-labelledby="other-offers-heading" className="mt-14">
          <h2 id="other-offers-heading" className="text-2xl font-semibold">Also listed</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">The pharmacy shows these as out of stock, so they sit outside the main list. Check availability on the pharmacy&apos;s site.</p>
          <ul className="mt-7 space-y-6">
            {other.map((offer, index) => (
              <OfferCard key={offer.id} offer={offer} now={now} placement={placement} linked={linked.has(offer.providerId)} max={max} sort={sort} index={ranked.length + index} context={context} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
