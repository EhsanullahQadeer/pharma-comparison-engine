import { SlidersHorizontal } from "lucide-react";

import { FilterChip, FilterGroup } from "@/components/ed/filter-chip";
import Link from "@/components/Link";
import { ingredientLabels, ingredientValues } from "@/lib/catalogue-labels";
import { comparisonHref, filterOffers } from "@/lib/comparison";
import type { ComparisonFilters, ComparisonSort, PublicOffer } from "@/types/comparison";

const sortOptions: { value: ComparisonSort; label: string }[] = [
  { value: "tablet", label: "Price per tablet" },
  { value: "total", label: "Total price" },
];

function uniqueSorted(values: number[]) {
  return [...new Set(values)].sort((a, b) => a - b);
}

// Options are derived from the offers actually on show, so a chip never leads to an empty page.
export function ComparisonFiltersPanel({ offers, filters }: { offers: PublicOffer[]; filters: ComparisonFilters }) {
  const { ingredient, strengthMg, packQuantity, sort } = filters;
  const strengths = uniqueSorted(filterOffers(offers, { ingredient, sort }).map((offer) => offer.variant.strengthMg));
  const packs = uniqueSorted(filterOffers(offers, { ingredient, strengthMg, sort }).map((offer) => offer.variant.packQuantity));
  const filtered = Boolean(ingredient || strengthMg || packQuantity);

  return (
    <section aria-label="Filter prices" className="mt-10 rounded-3xl border border-border bg-card/80 p-5 shadow-(--shadow) backdrop-blur sm:p-6 motion-safe:animate-fade-up">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-medium"><SlidersHorizontal aria-hidden="true" className="size-4" />Filter and sort</p>
        {filtered ? <Link href={comparisonHref({ sort })} scroll={false} className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline">Clear filters</Link> : null}
      </div>
      <div className="space-y-4">
        <FilterGroup label="Medicine">
          <FilterChip href={comparisonHref({ sort })} active={!ingredient}>All</FilterChip>
          {ingredientValues.map((value) => (
            <FilterChip key={value} href={comparisonHref({ ingredient: value, sort })} active={ingredient === value}>{ingredientLabels[value]}</FilterChip>
          ))}
        </FilterGroup>
        <FilterGroup label="Strength">
          <FilterChip href={comparisonHref({ ingredient, sort })} active={!strengthMg}>Any</FilterChip>
          {strengths.map((value) => (
            <FilterChip key={value} href={comparisonHref({ ingredient, strengthMg: value, sort })} active={strengthMg === value}>{value}mg</FilterChip>
          ))}
        </FilterGroup>
        <FilterGroup label="Pack size">
          <FilterChip href={comparisonHref({ ingredient, strengthMg, sort })} active={!packQuantity}>Any</FilterChip>
          {packs.map((value) => (
            <FilterChip key={value} href={comparisonHref({ ingredient, strengthMg, packQuantity: value, sort })} active={packQuantity === value}>{value} tablets</FilterChip>
          ))}
        </FilterGroup>
        <FilterGroup label="Sort by">
          {sortOptions.map((option) => (
            <FilterChip key={option.value} href={comparisonHref({ ...filters, sort: option.value })} active={sort === option.value}>{option.label}</FilterChip>
          ))}
        </FilterGroup>
      </div>
    </section>
  );
}
