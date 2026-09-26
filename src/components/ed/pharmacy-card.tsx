import { ArrowRight, MapPin, ShieldCheck } from "lucide-react";

import { PharmacyAvatar } from "@/components/ed/pharmacy-avatar";
import Link from "@/components/Link";
import { formatShortDate } from "@/lib/comparison";
import { formatPence } from "@/lib/money";
import { revealClass, revealStyle } from "@/lib/motion";
import { regulatorShortLabels } from "@/lib/provider-labels";
import type { PublicProviderSummary } from "@/types/comparison";

export function PharmacyCard({ provider, index }: { provider: PublicProviderSummary; index: number }) {
  return (
    <li className={revealClass} style={revealStyle(index)}>
      <Link
        href={`/ed/pharmacies/${provider.slug}`}
        className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-(--shadow) transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-ring"
      >
        <div className="flex items-start gap-4">
          <PharmacyAvatar name={provider.name} />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{provider.name}</h2>
            <p className="truncate text-sm text-muted-foreground">{provider.websiteDomain}</p>
          </div>
        </div>
        <div className="mt-5 mb-6 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 font-medium">
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            {regulatorShortLabels[provider.regulatorType]} {provider.regulatorReference}
          </span>
          {provider.serviceRegions.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-muted-foreground">
              <MapPin aria-hidden="true" className="size-3.5" />
              {provider.serviceRegions.join(", ")}
            </span>
          )}
        </div>
        <div className="mt-auto flex items-end justify-between gap-4 border-t border-border pt-5">
          <div>
            {provider.lowestPerTabletPence === null ? (
              <p className="text-sm text-muted-foreground">Prices being checked</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">From</p>
                <p className="text-xl font-semibold tabular-nums">{formatPence(provider.lowestPerTabletPence)}<span className="text-sm font-normal text-muted-foreground"> / tablet</span></p>
                <p className="text-xs text-muted-foreground">{provider.offerCount} price{provider.offerCount === 1 ? "" : "s"} listed</p>
              </>
            )}
          </div>
          <span className="flex size-9 items-center justify-center rounded-full border border-border transition-all duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
            <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            <span className="sr-only">View {provider.name}</span>
          </span>
        </div>
        {provider.evidenceCheckedAt ? <p className="mt-3 text-xs text-muted-foreground">Registration evidence checked {formatShortDate(provider.evidenceCheckedAt)}</p> : null}
      </Link>
    </li>
  );
}
