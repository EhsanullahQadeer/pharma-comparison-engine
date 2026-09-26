import { OfferCard } from "@/components/ed/offer-card";
import { OfferTable } from "@/components/ed/offer-table";
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

// Ranked list (fresh, in stock) followed by everything outside the ranking, each explained.
export function OfferResults({ offers, sort, now, context = "comparison", limit, layout = "cards" }: {
  offers: PublicOffer[];
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

  return (
    <>
      {ranked.length > 0 && (
        <section aria-labelledby="ranked-offers-heading" className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="ranked-offers-heading" className="text-2xl font-semibold">{rankedHeading[context](sort)}</h2>
            <p className="text-sm text-muted-foreground">{ranked.length} current price{ranked.length === 1 ? "" : "s"}</p>
          </div>
          {{
            cards: (
              <ol className="mt-7 space-y-6">
                {ranked.map((offer, index) => (
                  <OfferCard key={offer.id} offer={offer} now={now} rank={ranks ? index + 1 : undefined} best={index === bestIndex} max={max} sort={sort} index={index} context={context} />
                ))}
              </ol>
            ),
            table: (
              <div className="mt-7">
                <OfferTable offers={ranked} now={now} sort={sort} ranked={ranks} bestId={ranked[bestIndex]?.id} label={rankedHeading[context](sort)} />
              </div>
            ),
          }[layout]}
        </section>
      )}
      {other.length > 0 && (
        <section aria-labelledby="other-offers-heading" className="mt-14">
          <h2 id="other-offers-heading" className="text-2xl font-semibold">Also listed</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">These prices were last checked more than 24 hours ago or the pharmacy shows them as out of stock, so they sit outside the main list. Confirm the current price on the pharmacy&apos;s site.</p>
          {{
            cards: (
              <ul className="mt-7 space-y-6">
                {other.map((offer, index) => (
                  <OfferCard key={offer.id} offer={offer} now={now} max={max} sort={sort} index={ranked.length + index} context={context} />
                ))}
              </ul>
            ),
            table: (
              <div className="mt-7">
                <OfferTable offers={other} now={now} sort={sort} ranked={false} label="Also listed" />
              </div>
            ),
          }[layout]}
        </section>
      )}
    </>
  );
}
