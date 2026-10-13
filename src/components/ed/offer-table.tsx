import { ArrowRight, ArrowUpRight, Tag, Trophy } from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { FreshnessPill } from "@/components/ed/freshness-pill";
import { LinkNote } from "@/components/ed/link-note";
import { OutboundLink } from "@/components/ed/outbound-link";
import { PharmacyAvatar } from "@/components/ed/pharmacy-avatar";
import Link from "@/components/Link";
import type { ReferralPlacement } from "@/generated/prisma/client";
import { availabilityBadgeVariant, availabilityLabels } from "@/lib/catalogue-labels";
import { feeText, variantLabel, variantMedicineNote } from "@/lib/comparison";
import { discountHeadline } from "@/lib/discounts";
import { formatPence } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ComparisonSort, PublicOffer } from "@/types/comparison";

type RowProps = { offer: PublicOffer; now: Date; sort: ComparisonSort; placement: ReferralPlacement; partner: boolean; showOffers: boolean; showRank: boolean; rank?: number; best: boolean };

function OfferRow({ offer, now, sort, placement, partner, showOffers, showRank, rank, best }: RowProps) {
  return (
    <TableRow className={cn(best && "bg-primary/5 hover:bg-primary/10")}>
      {showRank ? (
        <TableCell className="text-center">
          {rank ? (
            <span className={cn("inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums", best ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
              <span className="sr-only">Rank </span>{rank}
            </span>
          ) : <span className="text-muted-foreground"><span aria-hidden="true">–</span><span className="sr-only">Not ranked</span></span>}
        </TableCell>
      ) : null}
      <TableCell>
        <div className="flex items-center gap-3">
          <PharmacyAvatar name={offer.providerName} logoUrl={offer.providerLogoUrl} />
          <div className="min-w-0">
            <Link href={`/ed/pharmacies/${offer.providerSlug}`} className="font-semibold underline-offset-4 hover:underline">{offer.providerName}</Link>
            <p className="text-xs text-muted-foreground">{variantLabel(offer.variant)} · {variantMedicineNote(offer.variant)}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {best ? (
                <Badge>
                  <Trophy aria-hidden="true" />
                  Lowest price
                </Badge>
              ) : null}
              {offer.availability !== "UNKNOWN" && <Badge variant={availabilityBadgeVariant[offer.availability]}>{availabilityLabels[offer.availability]}</Badge>}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatPence(offer.itemPricePence)}</TableCell>
      <TableCell className="text-right tabular-nums">{feeText(offer.deliveryFeePence, offer.feesVerified)}</TableCell>
      <TableCell className="text-right tabular-nums">
        <span className={cn(sort === "total" ? "text-base font-semibold" : "font-medium")}>{formatPence(offer.deliveredTotalPence)}</span>
        {/* The consultation column is gone, but any fee is still in the total — say so when there is one. */}
        {offer.consultationFeePence > 0 && <p className="text-xs text-muted-foreground">incl. {formatPence(offer.consultationFeePence)} consultation</p>}
        {offer.otherMandatoryFeesPence > 0 && <p className="text-xs text-muted-foreground">incl. {formatPence(offer.otherMandatoryFeesPence)} other fees</p>}
        {!offer.feesVerified && <p className="text-xs text-muted-foreground">Indicative</p>}
      </TableCell>
      <TableCell className={cn("text-right tabular-nums", sort === "tablet" ? "text-base font-semibold" : "font-medium")}>{formatPence(offer.perTabletPence)}</TableCell>
      {showOffers ? (
        <TableCell>
          <OfferDiscountCell offer={offer} />
        </TableCell>
      ) : null}
      <TableCell>
        <FreshnessPill freshness={offer.freshness} checkedAt={offer.checkedAt} now={now} compact />
        {offer.freshness === "stale" && <p className="mt-1 text-xs text-muted-foreground">May have changed</p>}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-col items-end gap-1">
          <Button
            size="sm"
            variant={best ? "default" : "outline"}
            className="rounded-full"
            nativeButton={false}
            render={
              <OutboundLink offerId={offer.id} placement={placement} partner={partner} rank={rank}>
                View
                <ArrowUpRight aria-hidden="true" className="size-4" />
                <span className="sr-only"> {offer.providerName} (opens {offer.providerDomain} in a new tab)</span>
              </OutboundLink>
            }
          />
          {partner ? <LinkNote className="whitespace-nowrap" /> : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

// Recorded discounts for this price (headline + code), linking through to the pharmacy's page where
// the offer, its terms and the pharmacy's checks are laid out. No discount → says so plainly.
function OfferDiscountCell({ offer }: { offer: PublicOffer }) {
  const [first, ...rest] = offer.discounts;
  return (
    <div className="flex flex-col items-start gap-1">
      {first ? (
        <>
          <Badge variant="secondary">
            <Tag aria-hidden="true" />
            {discountHeadline(first)}{rest.length > 0 && ` +${rest.length}`}
          </Badge>
          {first.code ? <code className="rounded border border-dashed border-primary/60 px-1.5 py-0.5 text-xs font-semibold tracking-wide">{first.code}</code> : null}
        </>
      ) : <p className="text-xs text-muted-foreground">No discount</p>}
      <Link href={`/ed/pharmacies/${offer.providerSlug}#offers`} className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap underline underline-offset-4 hover:text-muted-foreground">
        {first ? "See offer" : "Details"}
        <ArrowRight aria-hidden="true" className="size-3" />
        <span className="sr-only"> for {offer.providerName}</span>
      </Link>
    </div>
  );
}

// Every comparison row in one scannable table; scrolls horizontally on narrow screens. Ranked rows
// (in stock, by price) come first; `other` rows (out of stock) follow under an "Also listed"
// divider, unranked. The column the list is ranked by (`sort`) is emphasised.
export function OfferTable({ ranked, other, now, sort, placement, showRank, showOffers, bestId, label, partnerProviderIds, rankOffset = 0 }: {
  ranked: PublicOffer[];
  other: PublicOffer[];
  // Ranked rows on earlier pages, so a later page carries on the numbering instead of restarting at 1.
  rankOffset?: number;
  now: Date;
  sort: ComparisonSort;
  placement: ReferralPlacement;
  showRank: boolean;
  // The Offers column links to each pharmacy's page — pointless on that page itself.
  showOffers: boolean;
  bestId?: string;
  label: string;
  // Pharmacies whose "View" link is labelled as one we may earn from; every row gets a link.
  partnerProviderIds: ReadonlySet<string>;
}) {
  const columnCount = 7 + Number(showRank) + Number(showOffers);
  return (
    <Table resizable={false} stickyHeader={false} aria-label={label} className="min-w-4xl">
      <TableHeader>
        <TableRow>
          {showRank ? <TableHead className="w-14 text-center">#</TableHead> : null}
          <TableHead>Pharmacy</TableHead>
          <TableHead className="text-right">Medicine</TableHead>
          <TableHead className="text-right">Delivery</TableHead>
          <TableHead className={cn("text-right", sort === "total" && "text-foreground")}>Total</TableHead>
          <TableHead className={cn("text-right", sort === "tablet" && "text-foreground")}>Per tablet</TableHead>
          {showOffers ? <TableHead>Offers</TableHead> : null}
          <TableHead>Last checked</TableHead>
          <TableHead className="text-right"><span className="sr-only">Link</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ranked.map((offer, index) => (
          <OfferRow key={offer.id} offer={offer} now={now} sort={sort} placement={placement} partner={partnerProviderIds.has(offer.providerId)}showOffers={showOffers} showRank={showRank} rank={rankOffset + index + 1} best={offer.id === bestId} />
        ))}
        {other.length > 0 && (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={columnCount} className="bg-muted/60 py-3 whitespace-normal">
              <p className="font-semibold">Also listed</p>
              <p className="max-w-3xl text-xs text-muted-foreground">The pharmacy shows these as out of stock, so they aren&apos;t ranked. Check availability on the pharmacy&apos;s site.</p>
            </TableCell>
          </TableRow>
        )}
        {other.map((offer) => (
          <OfferRow key={offer.id} offer={offer} now={now} sort={sort} placement={placement} partner={partnerProviderIds.has(offer.providerId)}showOffers={showOffers} showRank={showRank} best={false} />
        ))}
      </TableBody>
    </Table>
  );
}
