import { SlidersHorizontal } from "lucide-react";

import { FilterChip, FilterGroup } from "@/components/ed/filter-chip";
import Link from "@/components/Link";
import { ingredientLabels, ingredientValues, purchaseModelValues } from "@/lib/catalogue-labels";
import { baseFormulation, comparisonHref, filterOffers, publicPurchaseModelLabels, slugify, variantTypeLabel, variantTypeSlug } from "@/lib/comparison";
import type { ComparisonFilters, ComparisonSort, PublicOffer } from "@/types/comparison";

const sortOptions: { value: ComparisonSort; label: string }[] = [
  { value: "tablet", label: "Price per tablet" },
  { value: "total", label: "Total price" },
];

function uniqueSorted(values: number[]) {
  return [...new Set(values)].sort((a, b) => a - b);
}

// Distinct slug → label pairs, in label order.
function labelledOptions(entries: [slug: string, label: string][]) {
  return [...new Map(entries).entries()].sort((a, b) => a[1].localeCompare(b[1]));
}

// Groups run top to bottom: each group's options come from the offers left by the groups above it,
// and choosing an option keeps those earlier choices but clears the later ones (which may no longer
// exist). Options are derived from the offers actually on show, so a chip never leads to an empty page.
export function ComparisonFiltersPanel({ offers, filters }: { offers: PublicOffer[]; filters: ComparisonFilters }) {
  const { ingredient, productType, strengthMg, formulation, packQuantity, purchaseModel, sort } = filters;
  const types = labelledOptions(filterOffers(offers, { ingredient, sort }).map((offer) => [variantTypeSlug(offer.variant), variantTypeLabel(offer.variant)]));
  const strengths = uniqueSorted(filterOffers(offers, { ingredient, productType, sort }).map((offer) => offer.variant.strengthMg));
  const forms = labelledOptions(filterOffers(offers, { ingredient, productType, strengthMg, sort }).map((offer) => [slugify(baseFormulation(offer.variant)), baseFormulation(offer.variant)]));
  const packs = uniqueSorted(filterOffers(offers, { ingredient, productType, strengthMg, formulation, sort }).map((offer) => offer.variant.packQuantity));
  const planModels = new Set(filterOffers(offers, { ingredient, productType, strengthMg, formulation, packQuantity, sort }).map((offer) => offer.purchaseModel));
  const plans = purchaseModelValues.filter((value) => planModels.has(value));
  const filtered = Boolean(ingredient || productType || strengthMg || formulation || packQuantity || purchaseModel);

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
        <FilterGroup label="Brand">
          <FilterChip href={comparisonHref({ ingredient, sort })} active={!productType}>Any</FilterChip>
          {types.map(([slug, label]) => (
            <FilterChip key={slug} href={comparisonHref({ ingredient, productType: slug, sort })} active={productType === slug}>{label}</FilterChip>
          ))}
        </FilterGroup>
        <FilterGroup label="Strength">
          <FilterChip href={comparisonHref({ ingredient, productType, sort })} active={!strengthMg}>Any</FilterChip>
          {strengths.map((value) => (
            <FilterChip key={value} href={comparisonHref({ ingredient, productType, strengthMg: value, sort })} active={strengthMg === value}>{value}mg</FilterChip>
          ))}
        </FilterGroup>
        {forms.length > 1 || formulation ? (
          <FilterGroup label="Form">
            <FilterChip href={comparisonHref({ ingredient, productType, strengthMg, sort })} active={!formulation}>Any</FilterChip>
            {forms.map(([slug, label]) => (
              <FilterChip key={slug} href={comparisonHref({ ingredient, productType, strengthMg, formulation: slug, sort })} active={formulation === slug}>{label}</FilterChip>
            ))}
          </FilterGroup>
        ) : null}
        <FilterGroup label="Pack size">
          <FilterChip href={comparisonHref({ ingredient, productType, strengthMg, formulation, sort })} active={!packQuantity}>Any</FilterChip>
          {packs.map((value) => (
            <FilterChip key={value} href={comparisonHref({ ingredient, productType, strengthMg, formulation, packQuantity: value, sort })} active={packQuantity === value}>{value} tablets</FilterChip>
          ))}
        </FilterGroup>
        {/* Nearly every price is one-off today, so the choice only appears once there is one to make. */}
        {plans.length > 1 || purchaseModel ? (
          <FilterGroup label="Buying">
            <FilterChip href={comparisonHref({ ingredient, productType, strengthMg, formulation, packQuantity, sort })} active={!purchaseModel}>Any</FilterChip>
            {plans.map((value) => (
              <FilterChip key={value} href={comparisonHref({ ingredient, productType, strengthMg, formulation, packQuantity, purchaseModel: value, sort })} active={purchaseModel === value}>{publicPurchaseModelLabels[value]}</FilterChip>
            ))}
          </FilterGroup>
        ) : null}
        <FilterGroup label="Sort by">
          {sortOptions.map((option) => (
            <FilterChip key={option.value} href={comparisonHref({ ...filters, sort: option.value })} active={sort === option.value}>{option.label}</FilterChip>
          ))}
        </FilterGroup>
      </div>
    </section>
  );
}
