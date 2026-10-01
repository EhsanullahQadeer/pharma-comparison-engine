import { ArrowRight } from "lucide-react";

import Link from "@/components/Link";
import { comparisonHref, variantProductName, variantTypeSlug } from "@/lib/comparison";
import { formatPence } from "@/lib/money";
import { revealClass, revealStyle } from "@/lib/motion";
import type { VariantPriceSummary } from "@/types/comparison";

export function VariantPriceCard({ summary, index }: { summary: VariantPriceSummary; index: number }) {
  const { variant, offerCount, lowestTotalPence, highestTotalPence, lowestPerTabletPence } = summary;
  const spread = highestTotalPence > lowestTotalPence;

  return (
    <li className={revealClass} style={revealStyle(index)}>
      <Link
        href={comparisonHref({ ingredient: variant.ingredient, productType: variantTypeSlug(variant), strengthMg: variant.strengthMg, packQuantity: variant.packQuantity })}
        className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-(--shadow) transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-ring"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">{variantProductName(variant)}</span>
          <span className="text-xs text-muted-foreground">{offerCount} pharmac{offerCount === 1 ? "y" : "ies"}</span>
        </div>
        <h3 className="mt-6 text-3xl font-semibold tracking-tight">{variant.strengthMg}mg</h3>
        <p className="text-sm text-muted-foreground">{variant.packQuantity} tablets · {variant.formulation}</p>
        <div className="mt-6">
          <p className="text-xs text-muted-foreground">From</p>
          <p className="text-2xl font-semibold tabular-nums">{formatPence(lowestTotalPence)}</p>
          <p className="text-sm text-muted-foreground tabular-nums">{formatPence(lowestPerTabletPence)} per tablet</p>
        </div>
        {spread ? <div className="mt-5">
            <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full origin-left rounded-full bg-linear-to-r from-chart-1 via-chart-2 to-chart-5 motion-safe:animate-grow-x" style={revealStyle(index + 3)} />
            </div>
            <p className="mt-2 flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>{formatPence(lowestTotalPence)}</span>
              <span>up to {formatPence(highestTotalPence)}</span>
            </p>
          </div> : null}
        <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-medium">
          Compare {offerCount} price{offerCount === 1 ? "" : "s"}
          <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </Link>
    </li>
  );
}
