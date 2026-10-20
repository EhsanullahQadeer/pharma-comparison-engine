import { getPublicPriceHistory } from "@/actions/offers/public-offers";
import { PriceSparkline } from "@/components/ed/price-sparkline";
import { variantLabel } from "@/lib/comparison";
import { formatPence } from "@/lib/money";
import { HISTORY_DAYS, priceMoved } from "@/lib/price-movement";
import type { PricePoint, PublicOffer } from "@/types/comparison";

const SHOWN = 6;

function HistoryItem({ offer, points }: { offer: PublicOffer; points: PricePoint[] }) {
  const values = points.map((point) => point.pence);
  const label = variantLabel(offer.variant);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          Now {formatPence(values.at(-1) ?? 0)} · low {formatPence(Math.min(...values))} · high {formatPence(Math.max(...values))}
        </p>
      </div>
      <PriceSparkline points={points} label={`${label} price over the last ${HISTORY_DAYS} days`} />
    </li>
  );
}

// "Price history": how each of this pharmacy's prices has moved over the last 90 days, from its
// recorded checks (medicine + delivery). Only prices that actually changed get a line — a flat
// line says nothing — and the rest are counted.
export async function PriceHistoryBlock({ offers, pharmacyName }: { offers: PublicOffer[]; pharmacyName: string }) {
  const history = await getPublicPriceHistory(offers.map((offer) => offer.id));
  const moved = offers
    .flatMap((offer) => {
      const points = history.get(offer.id) ?? [];
      return priceMoved(points) ? [{ offer, points }] : [];
    })
    .sort((a, b) => variantLabel(a.offer.variant).localeCompare(variantLabel(b.offer.variant)));
  const unchanged = offers.length - moved.length;

  return (
    <section aria-labelledby="price-history-heading" className="mt-12">
      <h2 id="price-history-heading" className="text-2xl font-semibold">Price history</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        How {pharmacyName}&apos;s prices have moved over the last {HISTORY_DAYS} days (medicine and delivery), from the checks we&apos;ve made of its website.
        {moved.length > 0 && unchanged > 0 ? ` ${unchanged} other price${unchanged === 1 ? " hasn't" : "s haven't"} changed.` : ""}
      </p>
      {moved.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-border bg-card/60 px-5 py-6 text-sm text-muted-foreground">None of {pharmacyName}&apos;s prices have changed in the last {HISTORY_DAYS} days.</p>
      ) : (
        <>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {moved.slice(0, SHOWN).map(({ offer, points }) => <HistoryItem key={offer.id} offer={offer} points={points} />)}
          </ul>
          {moved.length > SHOWN ? (
            <details className="mt-3">
              <summary className="inline-flex min-h-9 cursor-pointer items-center text-sm font-medium underline-offset-4 hover:underline">Show {moved.length - SHOWN} more</summary>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {moved.slice(SHOWN).map(({ offer, points }) => <HistoryItem key={offer.id} offer={offer} points={points} />)}
              </ul>
            </details>
          ) : null}
        </>
      )}
    </section>
  );
}
