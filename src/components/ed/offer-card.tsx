import { ArrowUpRight, Trophy } from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { FreshnessPill } from "@/components/ed/freshness-pill";
import { LinkNote } from "@/components/ed/link-note";
import { OutboundLink } from "@/components/ed/outbound-link";
import { PriceBar } from "@/components/ed/price-bar";
import { WasPrice } from "@/components/ed/was-price";
import Link from "@/components/Link";
import type { ReferralPlacement } from "@/generated/prisma/client";
import { availabilityBadgeVariant, availabilityLabels } from "@/lib/catalogue-labels";
import { feeText, offerAnchor, offerSortValue, subscriptionTerms, variantLabel, variantMedicineNote } from "@/lib/comparison";
import { formatPence } from "@/lib/money";
import { revealClass, revealStyle } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { ComparisonSort, PublicOffer } from "@/types/comparison";

export function OfferCard({ offer, now, placement, partner, rank, best, max, sort, index, context = "comparison" }: {
  offer: PublicOffer;
  now: Date;
  placement: ReferralPlacement;
  // Every pharmacy gets a "View at pharmacy" button; a partner's is labelled as one we may earn from.
  partner: boolean;
  rank?: number;
  best?: boolean;
  max: number;
  sort: ComparisonSort;
  index: number;
  // On a pharmacy's own profile the pharmacy is implied, so the product becomes the title.
  context?: "comparison" | "profile";
}) {
  const fees = [
    { label: "Medicine", value: <>{formatPence(offer.itemPricePence)}{offer.wasPricePence !== null ? <WasPrice pence={offer.wasPricePence} className="ml-1 font-normal" /> : null}</> },
    { label: "Delivery", value: feeText(offer.deliveryFeePence, offer.feesVerified) },
    { label: "Consultation", value: feeText(offer.consultationFeePence, offer.feesVerified) },
    ...(offer.otherMandatoryFeesPence > 0 ? [{ label: "Other fees", value: formatPence(offer.otherMandatoryFeesPence) }] : []),
  ];
  const product = `${variantLabel(offer.variant)} · ${variantMedicineNote(offer.variant)}`;
  const terms = subscriptionTerms(offer);

  return (
    <li
      id={offerAnchor(offer.id)}
      tabIndex={-1}
      className={cn(
        // Arriving from a price in the comparison grid marks the price that was clicked (HashHighlight).
        "group relative scroll-mt-28 rounded-3xl border bg-card p-5 shadow-(--shadow) transition-all duration-300 outline-none hover:-translate-y-0.5 hover:shadow-lg data-highlighted:ring-2 data-highlighted:ring-primary sm:p-6",
        best ? "border-primary/60 ring-1 ring-primary/30" : "border-border hover:border-primary/40",
        revealClass,
      )}
      style={revealStyle(index)}
    >
      {best ? (
        <span className="absolute -top-3 left-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-(--shadow) sm:left-6">
          <Trophy aria-hidden="true" className="size-3.5" />
          Lowest price
        </span>
      ) : null}
      <div className="grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-center">
        {rank ? (
          <span className="hidden size-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground tabular-nums transition-colors group-hover:bg-primary/20 md:flex">
            <span className="sr-only">Rank </span>{rank}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">
            {context === "profile" ? variantLabel(offer.variant) : (
              <Link href={`/ed/pharmacies/${offer.providerSlug}`} className="underline-offset-4 hover:underline">{offer.providerName}</Link>
            )}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{context === "profile" ? `${variantMedicineNote(offer.variant)} · ${offer.variant.formulation}` : product}</p>
          {terms ? <p className="mt-0.5 text-sm font-medium">{terms.full}</p> : null}
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
            {fees.map((fee) => (
              <div key={fee.label} className="flex gap-1">
                <dt className="text-muted-foreground">{fee.label}</dt>
                <dd className="font-medium tabular-nums">{fee.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <FreshnessPill freshness={offer.freshness} checkedAt={offer.checkedAt} now={now} />
            {offer.availability !== "UNKNOWN" && <Badge variant={availabilityBadgeVariant[offer.availability]}>{availabilityLabels[offer.availability]}</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4 md:flex-col md:items-end md:text-right">
          <div>
            <p className="text-xs text-muted-foreground">{offer.feesVerified ? "Total to pay" : "Indicative total"}</p>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatPence(offer.deliveredTotalPence)}</p>
            <p className="text-sm text-muted-foreground tabular-nums">{formatPence(offer.perTabletPence)} per tablet</p>
          </div>
          <div className="space-y-1.5 md:text-right">
            <Button
              size="lg"
              variant={best ? "default" : "outline"}
              className="rounded-full px-4 transition-transform active:scale-95"
              nativeButton={false}
              render={
                <OutboundLink offer={offer} placement={placement} partner={partner} rank={rank}>
                  View at pharmacy
                  <ArrowUpRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  <span className="sr-only"> (opens {offer.providerDomain} in a new tab)</span>
                </OutboundLink>
              }
            />
            {partner ? <LinkNote /> : null}
          </div>
        </div>
      </div>
      <div className="mt-5">
        <PriceBar value={offerSortValue[sort](offer)} max={max} highlight={best} style={revealStyle(index + 3)} />
      </div>
    </li>
  );
}
