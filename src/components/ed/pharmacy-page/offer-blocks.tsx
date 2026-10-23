import { ArrowUpRight, CalendarClock, Layers, PackageSearch, TicketPercent } from "lucide-react";
import { Suspense } from "react";

import { Button } from "@/components/common/button";
import { HashHighlight } from "@/components/common/hash-highlight";
import { CopyCodeButton } from "@/components/ed/copy-code-button";
import { LinkNote } from "@/components/ed/link-note";
import { OutboundLink } from "@/components/ed/outbound-link";
import { ProductPriceGrid, productGridId } from "@/components/ed/pharmacy-page/product-price-grid";
import { PriceHistoryBlock } from "@/components/ed/price-history-block";
import { PublicEmptyState } from "@/components/ed/public-empty-state";
import { PriceHistorySkeleton } from "@/components/ed/skeletons";
import { formatShortDate } from "@/lib/comparison";
import { discountHeadline } from "@/lib/discounts";
import { cn } from "@/lib/utils";
import type { PublicDiscount } from "@/types/comparison";
import type { PharmacyPageModel } from "@/types/pharmacy-page";

// Offer-area blocks of the pharmacy profile: the visit action, discounts and the price grids.

// The main call to action: a counted link to the cheapest offer's page (/go), or the pharmacy's
// homepage (not counted) if nothing is priced yet.
export function VisitAction({ model, className }: { model: PharmacyPageModel; className?: string }) {
  const { provider, partner, bestOffer } = model;
  const label = (
    <>
      Visit {provider.name}
      <ArrowUpRight aria-hidden="true" className="size-4" />
      <span className="sr-only"> (opens {provider.websiteDomain} in a new tab)</span>
    </>
  );
  const link = bestOffer
    ? <OutboundLink offer={bestOffer} placement="PHARMACY_PROFILE" partner={partner}>{label}</OutboundLink>
    : <a href={`https://${provider.websiteDomain}`} target="_blank" rel="nofollow noopener noreferrer">{label}</a>;
  return (
    <div className={className}>
      <Button nativeButton={false} className="h-10 w-full rounded-full px-5" render={link} />
      {partner ? <LinkNote className="mt-1.5 text-center" /> : null}
    </div>
  );
}

function DiscountMeta({ discount }: { discount: PublicDiscount }) {
  return (
    <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <li>{discount.eligibility}</li>
      {discount.expiresAt ? <li className="inline-flex items-center gap-1"><CalendarClock aria-hidden="true" className="size-3.5" />Until {formatShortDate(discount.expiresAt)}</li> : null}
      <li className="inline-flex items-center gap-1"><Layers aria-hidden="true" className="size-3.5" />{discount.stackable ? "Can be combined" : "Can't be combined"}</li>
    </ul>
  );
}

const sectionHeading = "text-xl font-semibold tracking-tight";

// Every checked discount on record, with its code to copy. With none on record it says so in one
// line, rather than implying an offer exists.
export function DiscountList({ model, className }: { model: PharmacyPageModel; className?: string }) {
  const { discounts, provider } = model;
  return (
    <section aria-labelledby="offers" className={cn("scroll-mt-28", className)}>
      <h2 id="offers" className={sectionHeading}>Discount codes</h2>
      {discounts.length === 0 ? (
        <p className="mt-3 flex gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          <TicketPercent aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>No checked discount code on record for {provider.name}. Any offer it runs will show at its own checkout; codes listed on other sites may not work.</span>
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {discounts.map((discount) => (
            <li key={discount.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{discountHeadline(discount)}</p>
                <DiscountMeta discount={discount} />
              </div>
              {discount.code ? <CopyCodeButton code={discount.code} /> : <p className="text-sm font-medium">Applied automatically</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Every current price as one grid per product, then how the prices have moved.
export function PricesBlock({ model, className }: { model: PharmacyPageModel; className?: string }) {
  const { provider, priceGrids } = model;
  return (
    <section aria-labelledby="prices" className={cn("scroll-mt-28", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="prices" className={sectionHeading}>Current prices</h2>
        {provider.offers.length > 0 ? <p className="text-sm text-muted-foreground">{provider.offers.length} prices · totals include delivery and any fees</p> : null}
      </div>
      {provider.offers.length === 0 ? (
        <PublicEmptyState icon={PackageSearch} title="Prices are being checked" description={`We haven't published a current price for ${provider.name} yet. Compare other pharmacies in the meantime.`} action={{ href: "/ed/compare", label: "Compare prices" }} />
      ) : (
        <>
          {priceGrids.length > 1 ? (
            // One swipeable row on phones, wrapping from sm up.
            <nav aria-label="Products" className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              {priceGrids.map((grid) => (
                <a key={grid.key} href={`#${productGridId(grid)}`} className="shrink-0 rounded-full border border-border bg-card px-3 py-1 text-sm whitespace-nowrap transition-colors hover:border-primary/50 hover:bg-muted">
                  {grid.product}{grid.formNote ? ` · ${grid.formNote}` : ""}{grid.subscription ? " · subscription" : ""}
                </a>
              ))}
            </nav>
          ) : null}
          <div className="mt-4 space-y-4">
            {priceGrids.map((grid) => <ProductPriceGrid key={grid.key} grid={grid} model={model} />)}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Select a price to open it on {provider.websiteDomain}. * Delivery or consultation fees not yet verified, so the total is indicative.</p>
          {/* A price clicked in the comparison grid links here as #offer-<id>. */}
          <HashHighlight prefix="offer-" />
          <Suspense fallback={<PriceHistorySkeleton />}>
            <PriceHistoryBlock offers={provider.offers} pharmacyName={provider.name} />
          </Suspense>
        </>
      )}
    </section>
  );
}
