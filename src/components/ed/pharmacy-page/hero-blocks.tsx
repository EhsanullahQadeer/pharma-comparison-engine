import { ArrowRight, BadgeCheck, Clock3, Globe } from "lucide-react";

import { Button } from "@/components/common/button";
import { PharmacyAvatar } from "@/components/ed/pharmacy-avatar";
import { VisitAction } from "@/components/ed/pharmacy-page/offer-blocks";
import Link from "@/components/Link";
import { formatCheckedAgo } from "@/lib/comparison";
import { formatPence } from "@/lib/money";
import { regulatorEntryUrls, regulatorShortLabels } from "@/lib/provider-labels";
import { cn } from "@/lib/utils";
import type { PharmacyPageModel } from "@/types/pharmacy-page";

// The pharmacy profile's header area: breadcrumbs, then one compact card with who the pharmacy is,
// how it's registered, when we last checked it, its headline numbers and the two actions.

export function PharmacyCrumbs({ name, className }: { name: string; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex flex-wrap gap-2 text-sm text-muted-foreground", className)}>
      <Link href="/" className="hover:text-foreground hover:underline">Home</Link>
      <span aria-hidden="true">/</span>
      <Link href="/ed/pharmacies" className="hover:text-foreground hover:underline">Pharmacies</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page" className="text-foreground">{name}</span>
    </nav>
  );
}

function stats(model: PharmacyPageModel) {
  return [
    { label: "From, per tablet", value: model.bestOffer ? formatPence(model.bestOffer.perTabletPence) : "—" },
    { label: "Lowest total", value: model.lowestTotalPence !== null ? formatPence(model.lowestTotalPence) : "—" },
    { label: "Current prices", value: String(model.provider.offers.length) },
    { label: "Discount codes", value: model.discounts.length > 0 ? String(model.discounts.length) : "None on record" },
  ];
}

const metaLink = "inline-flex items-center gap-1.5 underline-offset-4 hover:text-foreground hover:underline";

export function ProfileHeader({ model, className }: { model: PharmacyPageModel; className?: string }) {
  const { provider, latestCheckAt, now } = model;
  return (
    <header className={cn("rounded-2xl border border-border bg-card p-5 shadow-(--shadow) sm:p-6", className)}>
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <PharmacyAvatar name={provider.name} logoUrl={provider.logoUrl} size="lg" className="shrink-0" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{provider.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Prices, discount codes and registration checks</p>
            <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <li>
                <a href={`https://${provider.websiteDomain}`} target="_blank" rel="nofollow noopener noreferrer" className={metaLink}>
                  <Globe aria-hidden="true" className="size-3.5" />{provider.websiteDomain}<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
              <li>
                <a href={regulatorEntryUrls[provider.regulatorType](provider.regulatorReference)} target="_blank" rel="noopener noreferrer" className={metaLink}>
                  <BadgeCheck aria-hidden="true" className="size-3.5 text-primary" />{regulatorShortLabels[provider.regulatorType]} {provider.regulatorReference}<span className="sr-only"> (opens the register in a new tab)</span>
                </a>
              </li>
              {latestCheckAt ? (
                <li className="inline-flex items-center gap-1.5">
                  <Clock3 aria-hidden="true" className="size-3.5" />Checked <time dateTime={latestCheckAt.toISOString()}>{formatCheckedAgo(latestCheckAt, now)}</time>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col md:items-stretch">
          <VisitAction model={model} />
          <Button variant="outline" nativeButton={false} className="h-10 rounded-full px-5" render={<Link href="/ed/compare">Compare with other pharmacies<ArrowRight aria-hidden="true" className="size-4" /></Link>} />
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
        {stats(model).map(({ label, value }) => (
          <div key={label} className="bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
