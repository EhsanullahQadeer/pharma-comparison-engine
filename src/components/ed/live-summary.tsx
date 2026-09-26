import { formatCheckedAgo } from "@/lib/comparison";
import type { PublicOffer } from "@/types/comparison";

// Hero-side "live data" card: how many prices/pharmacies are behind the page and how recent.
export function LiveSummary({ offers, now }: { offers: PublicOffer[]; now: Date }) {
  if (offers.length === 0) return null;
  const pharmacies = new Set(offers.map((offer) => offer.providerId)).size;
  const latest = new Date(Math.max(...offers.map((offer) => offer.checkedAt.getTime())));

  return (
    <div className="w-full rounded-3xl border border-border bg-card/80 p-5 shadow-(--shadow) backdrop-blur lg:w-72">
      <p className="flex items-center gap-2 text-sm font-medium">
        <span className="relative flex size-2.5">
          <span aria-hidden="true" className="absolute inline-flex size-full rounded-full bg-primary opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
        </span>
        Live prices
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{offers.length}</p>
      <p className="text-sm text-muted-foreground">prices from {pharmacies} pharmac{pharmacies === 1 ? "y" : "ies"}</p>
      <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">Latest check <time dateTime={latest.toISOString()}>{formatCheckedAgo(latest, now)}</time>, read from each pharmacy&apos;s own website.</p>
    </div>
  );
}
