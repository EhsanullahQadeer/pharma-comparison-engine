import { ArrowUpRight, CalendarClock, Globe, Layers, PackageSearch, TicketPercent } from "lucide-react";

import { Button } from "@/components/common/button";
import { CopyCodeButton } from "@/components/ed/copy-code-button";
import { LinkNote } from "@/components/ed/link-note";
import { OfferResults } from "@/components/ed/offer-results";
import { OutboundLink } from "@/components/ed/outbound-link";
import { PublicEmptyState } from "@/components/ed/public-empty-state";
import { formatShortDate, variantLabel } from "@/lib/comparison";
import { discountHeadline } from "@/lib/discounts";
import { formatPence } from "@/lib/money";
import { revealClass, revealStyle } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { PublicDiscount } from "@/types/comparison";
import type { PharmacyPageModel } from "@/types/pharmacy-page";

// Offer-area building blocks shared by the ten pharmacy profile layouts.

type VisitTone = "primary" | "inverse" | "outline";

const visitButtonClass: Record<VisitTone, string> = {
  primary: "",
  inverse: "bg-background text-foreground hover:bg-background/90",
  outline: "",
};

// The one call to action. Partners: tracked link to the cheapest offer's page (/go), or their
// homepage if nothing is priced yet. Everyone else: the domain as plain text, never a link.
export function VisitAction({ model, tone = "primary", className, full = false }: { model: PharmacyPageModel; tone?: VisitTone; className?: string; full?: boolean }) {
  const { provider, linked, bestOffer } = model;
  if (!linked) {
    return (
      <div className={className}>
        <p className="inline-flex items-center gap-2 font-medium"><Globe aria-hidden="true" className="size-4 opacity-70" />{provider.websiteDomain}</p>
        <LinkNote linked={false} className="mt-1 text-current opacity-75" />
      </div>
    );
  }
  const label = (
    <>
      See {provider.name}&apos;s current offer
      <ArrowUpRight aria-hidden="true" className="size-4" />
      <span className="sr-only"> (opens {provider.websiteDomain} in a new tab)</span>
    </>
  );
  const link = bestOffer
    ? <OutboundLink offerId={bestOffer.id} placement="PHARMACY_PROFILE">{label}</OutboundLink>
    : <a href={`https://${provider.websiteDomain}`} target="_blank" rel="nofollow noopener noreferrer">{label}</a>;
  return (
    <div className={className}>
      <Button size="lg" variant={tone === "outline" ? "outline" : "default"} nativeButton={false} className={cn("h-auto rounded-full px-6 py-3 whitespace-normal transition-transform active:scale-95", full && "w-full", visitButtonClass[tone])} render={link} />
      <LinkNote linked className="mt-2 text-current opacity-75" />
    </div>
  );
}

type OfferTone = "dark" | "light" | "primary";

const offerToneClass: Record<OfferTone, { card: string; muted: string; visit: VisitTone }> = {
  dark: { card: "bg-foreground text-background", muted: "text-background/70", visit: "primary" },
  light: { card: "border border-border bg-card", muted: "text-muted-foreground", visit: "primary" },
  primary: { card: "bg-primary text-primary-foreground", muted: "text-primary-foreground/75", visit: "inverse" },
};

// The monj "current offer" card: the best recorded discount (or cheapest price) and the CTA.
export function BestOfferCard({ model, tone = "dark", className }: { model: PharmacyPageModel; tone?: OfferTone; className?: string }) {
  const { provider, bestOffer, discounts } = model;
  const styles = offerToneClass[tone];
  const topDiscount = discounts[0];
  const heading = topDiscount ? `${discountHeadline(topDiscount)} at ${provider.name}` : `View ${provider.name}'s best available price`;
  return (
    <section aria-labelledby="best-offer-heading" className={cn("relative isolate overflow-hidden rounded-4xl p-7 shadow-(--shadow) sm:p-10", styles.card, className)}>
      <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 -z-10 size-56 rounded-full border-[28px] border-current opacity-[0.06]" />
      <p className={cn("text-xs font-semibold tracking-[0.18em] uppercase", styles.muted)}>Current {provider.name} offer</p>
      <h2 id="best-offer-heading" className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{heading}</h2>
      {bestOffer ? (
        <p className={cn("mt-4 max-w-xl leading-relaxed", styles.muted)}>
          From <strong className="font-semibold text-current">{formatPence(bestOffer.perTabletPence)} per tablet</strong>: {variantLabel(bestOffer.variant)}, {formatPence(bestOffer.deliveredTotalPence)} in total, checked {formatShortDate(bestOffer.checkedAt)}.
        </p>
      ) : <p className={cn("mt-4 max-w-xl leading-relaxed", styles.muted)}>We haven&apos;t published a current price for {provider.name} yet.</p>}
      {topDiscount?.code ? <div className="mt-5"><CopyCodeButton code={topDiscount.code} className={cn(tone === "dark" && "bg-background text-foreground")} /></div> : null}
      <VisitAction model={model} tone={styles.visit} className="mt-7" />
      <p className={cn("mt-5 max-w-xl text-xs leading-relaxed", styles.muted)}>The pharmacy still needs to assess whether treatment is suitable for you. No discount is added by our link.</p>
    </section>
  );
}

function DiscountMeta({ discount }: { discount: PublicDiscount }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {discount.expiresAt ? <li className="inline-flex items-center gap-1"><CalendarClock aria-hidden="true" className="size-3.5" />Until {formatShortDate(discount.expiresAt)}</li> : null}
      <li className="inline-flex items-center gap-1"><Layers aria-hidden="true" className="size-3.5" />{discount.stackable ? "Can be combined" : "Can't be combined"}</li>
    </ul>
  );
}

type DiscountStyle = "tickets" | "rows";

// Every checked discount on record, with its code to copy. With none on record it says so and
// explains what that means, rather than implying an offer exists.
export function DiscountList({ model, style = "rows", title = "Offers and discount codes", className }: { model: PharmacyPageModel; style?: DiscountStyle; title?: string; className?: string }) {
  const { discounts, provider } = model;
  return (
    <section aria-labelledby="offers" className={cn("scroll-mt-24", className)}>
      <h2 id="offers" className="text-2xl font-semibold tracking-tight">{title}</h2>
      {discounts.length === 0 ? (
        <div className="mt-5 flex gap-4 rounded-3xl border border-dashed border-border p-6">
          <TicketPercent aria-hidden="true" className="size-6 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-semibold">No discount code on record for {provider.name}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">We only show discounts our team has checked. If {provider.name} is running an offer, it will appear on {provider.websiteDomain} at checkout. Codes offered on other sites for this pharmacy may not work.</p>
          </div>
        </div>
      ) : (
        <ul className={cn("mt-5 grid gap-4", style === "tickets" && "sm:grid-cols-2")}>
          {discounts.map((discount, index) => (
            <li
              key={discount.id}
              className={cn(
                revealClass,
                style === "tickets"
                  ? "relative rounded-3xl border-2 border-dashed border-primary/50 bg-card p-6 before:absolute before:top-1/2 before:-left-3 before:size-6 before:-translate-y-1/2 before:rounded-full before:border-2 before:border-dashed before:border-primary/50 before:bg-background after:absolute after:top-1/2 after:-right-3 after:size-6 after:-translate-y-1/2 after:rounded-full after:border-2 after:border-dashed after:border-primary/50 after:bg-background"
                  : "flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between",
              )}
              style={revealStyle(index)}
            >
              <div>
                <p className="text-2xl font-semibold tracking-tight">{discountHeadline(discount)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{discount.eligibility}</p>
                <DiscountMeta discount={discount} />
              </div>
              <div className={cn(style === "tickets" && "mt-5")}>
                {discount.code ? <CopyCodeButton code={discount.code} /> : <p className="text-sm font-medium">Applied automatically, no code needed</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Every current price for this pharmacy. Wraps OfferResults (which brings its own heading).
export function PricesBlock({ model, layout = "cards", className }: { model: PharmacyPageModel; layout?: "cards" | "table"; className?: string }) {
  const { provider, now } = model;
  return (
    <div id="prices" className={cn("scroll-mt-24", className)}>
      {provider.offers.length === 0 ? (
        <PublicEmptyState icon={PackageSearch} title="Prices are being checked" description={`We haven't published a current price for ${provider.name} yet. Compare other pharmacies in the meantime.`} action={{ href: "/ed/compare", label: "Compare prices" }} />
      ) : (
        <OfferResults offers={provider.offers} sort="tablet" now={now} placement="PHARMACY_PROFILE" context="profile" layout={layout} />
      )}
    </div>
  );
}
