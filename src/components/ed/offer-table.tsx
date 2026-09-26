import { ArrowUpRight, Trophy } from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { FreshnessPill } from "@/components/ed/freshness-pill";
import { PharmacyAvatar } from "@/components/ed/pharmacy-avatar";
import Link from "@/components/Link";
import { availabilityBadgeVariant, availabilityLabels } from "@/lib/catalogue-labels";
import { feeText, variantLabel, variantTypeLabel } from "@/lib/comparison";
import { formatPence } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ComparisonSort, PublicOffer } from "@/types/comparison";

// Comparison rows as one scannable table; scrolls horizontally on narrow screens. The column the
// list is ranked by (`sort`) is emphasised so the ordering reads at a glance.
export function OfferTable({ offers, now, sort, ranked, bestId, label }: {
  offers: PublicOffer[];
  now: Date;
  sort: ComparisonSort;
  ranked: boolean;
  bestId?: string;
  label: string;
}) {
  return (
    <Table resizable={false} stickyHeader={false} aria-label={label} className="min-w-4xl">
      <TableHeader>
        <TableRow>
          {ranked ? <TableHead className="w-14 text-center">#</TableHead> : null}
          <TableHead>Pharmacy</TableHead>
          <TableHead className="text-right">Medicine</TableHead>
          <TableHead className="text-right">Delivery</TableHead>
          <TableHead className="text-right">Consultation</TableHead>
          <TableHead className={cn("text-right", sort === "total" && "text-foreground")}>Total</TableHead>
          <TableHead className={cn("text-right", sort === "tablet" && "text-foreground")}>Per tablet</TableHead>
          <TableHead>Last checked</TableHead>
          <TableHead className="text-right"><span className="sr-only">Link</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {offers.map((offer, index) => {
          const best = offer.id === bestId;
          return (
            <TableRow key={offer.id} className={cn(best && "bg-primary/5 hover:bg-primary/10")}>
              {ranked ? (
                <TableCell className="text-center">
                  <span className={cn("inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums", best ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
                    <span className="sr-only">Rank </span>{index + 1}
                  </span>
                </TableCell>
              ) : null}
              <TableCell>
                <div className="flex items-center gap-3">
                  <PharmacyAvatar name={offer.providerName} />
                  <div className="min-w-0">
                    <Link href={`/ed/pharmacies/${offer.providerSlug}`} className="font-semibold underline-offset-4 hover:underline">{offer.providerName}</Link>
                    <p className="text-xs text-muted-foreground">{variantLabel(offer.variant)} · {variantTypeLabel(offer.variant)}</p>
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
                {feeText(offer.consultationFeePence, offer.feesVerified)}
                {offer.otherMandatoryFeesPence > 0 && <p className="text-xs text-muted-foreground">+{formatPence(offer.otherMandatoryFeesPence)} other fees</p>}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <span className={cn(sort === "total" ? "text-base font-semibold" : "font-medium")}>{formatPence(offer.deliveredTotalPence)}</span>
                {!offer.feesVerified && <p className="text-xs text-muted-foreground">Indicative</p>}
              </TableCell>
              <TableCell className={cn("text-right tabular-nums", sort === "tablet" ? "text-base font-semibold" : "font-medium")}>{formatPence(offer.perTabletPence)}</TableCell>
              <TableCell><FreshnessPill freshness={offer.freshness} checkedAt={offer.checkedAt} now={now} /></TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant={best ? "default" : "outline"}
                  className="rounded-full"
                  nativeButton={false}
                  render={
                    <a href={offer.sourceUrl} target="_blank" rel="nofollow noopener noreferrer">
                      View
                      <ArrowUpRight aria-hidden="true" className="size-4" />
                      <span className="sr-only"> {offer.providerName} (opens {offer.providerDomain} in a new tab)</span>
                    </a>
                  }
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
