import { SlidersHorizontal, X } from "lucide-react";

import { FilterDropdown } from "@/components/ed/filter-dropdown";
import Link from "@/components/Link";
import { ingredientLabels, ingredientValues, purchaseModelValues } from "@/lib/catalogue-labels";
import { baseFormulation, comparisonHref, filterOffers, publicPurchaseModelLabels, slugify, variantProductName, variantTypeSlug } from "@/lib/comparison";
import type { ComparisonFilters, ComparisonSort, FilterOption, FilterOptionGroup, PublicOffer } from "@/types/comparison";

const sortLabels: Record<ComparisonSort, string> = { tablet: "Price per tablet", total: "Total price" };
const sortValues = Object.keys(sortLabels) as ComparisonSort[];

function uniqueSorted(values: number[]) {
  return [...new Set(values)].sort((a, b) => a - b);
}

// Distinct slug → label pairs, in label order.
function labelledOptions(entries: [slug: string, label: string][]) {
  return [...new Map(entries).entries()].sort((a, b) => a[1].localeCompare(b[1]));
}

// Every product with a price on show, in name order. A product is a medicine plus a type, since
// "generic" is a type of both medicines.
function productOptions(offers: PublicOffer[]) {
  const products = new Map<string, { ingredient: PublicOffer["variant"]["ingredient"]; productType: string; label: string }>();
  for (const { variant } of offers) {
    const productType = variantTypeSlug(variant);
    products.set(`${variant.ingredient}-${productType}`, { ingredient: variant.ingredient, productType, label: variantProductName(variant) });
  }
  return [...products.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function selectedLabel(groups: FilterOptionGroup[]) {
  return groups.flatMap((group) => group.options).find((option) => option.active)?.label ?? "Any";
}

// Product comes first: it is how shoppers look for a price, grouped under its medicine (whose
// "All …" entry is the broader choice). From Strength on, dropdowns run left to right: each one's
// options come from the offers left by the ones before it, and choosing an option keeps those
// earlier choices but clears the later ones (which may no longer exist). Options are derived from
// the offers actually on show, so a choice never leads to an empty page.
export function ComparisonFiltersPanel({ offers, filters }: { offers: PublicOffer[]; filters: ComparisonFilters }) {
  const { ingredient, productType, strengthMg, formulation, packQuantity, purchaseModel, sort } = filters;
  const products = productOptions(offers);
  const strengths = uniqueSorted(filterOffers(offers, { ingredient, productType, sort }).map((offer) => offer.variant.strengthMg));
  const forms = labelledOptions(filterOffers(offers, { ingredient, productType, strengthMg, sort }).map((offer) => [slugify(baseFormulation(offer.variant)), baseFormulation(offer.variant)]));
  const packs = uniqueSorted(filterOffers(offers, { ingredient, productType, strengthMg, formulation, sort }).map((offer) => offer.variant.packQuantity));
  const planModels = new Set(filterOffers(offers, { ingredient, productType, strengthMg, formulation, packQuantity, sort }).map((offer) => offer.purchaseModel));
  const plans = purchaseModelValues.filter((value) => planModels.has(value));
  const resultCount = filterOffers(offers, filters).length;

  const productGroups: FilterOptionGroup[] = [
    { options: [{ label: "All products", href: comparisonHref({ sort }), active: !ingredient && !productType }] },
    ...ingredientValues.map((value) => ({
      label: ingredientLabels[value],
      options: [
        { label: `All ${ingredientLabels[value].toLowerCase()}`, href: comparisonHref({ ingredient: value, sort }), active: ingredient === value && !productType },
        ...products
          .filter((product) => product.ingredient === value)
          .map((product) => ({ label: product.label, href: comparisonHref({ ingredient: value, productType: product.productType, sort }), active: ingredient === value && productType === product.productType })),
      ],
    })),
  ];
  const strengthGroups: FilterOptionGroup[] = [{
    options: [
      { label: "Any strength", href: comparisonHref({ ingredient, productType, sort }), active: !strengthMg },
      ...strengths.map((value) => ({ label: `${value}mg`, href: comparisonHref({ ingredient, productType, strengthMg: value, sort }), active: strengthMg === value })),
    ],
  }];
  const formGroups: FilterOptionGroup[] = [{
    options: [
      { label: "Any form", href: comparisonHref({ ingredient, productType, strengthMg, sort }), active: !formulation },
      ...forms.map(([slug, label]) => ({ label, href: comparisonHref({ ingredient, productType, strengthMg, formulation: slug, sort }), active: formulation === slug })),
    ],
  }];
  const packGroups: FilterOptionGroup[] = [{
    options: [
      { label: "Any pack size", href: comparisonHref({ ingredient, productType, strengthMg, formulation, sort }), active: !packQuantity },
      ...packs.map((value) => ({ label: `${value} tablet${value === 1 ? "" : "s"}`, href: comparisonHref({ ingredient, productType, strengthMg, formulation, packQuantity: value, sort }), active: packQuantity === value })),
    ],
  }];
  const planGroups: FilterOptionGroup[] = [{
    options: [
      { label: "Any", href: comparisonHref({ ingredient, productType, strengthMg, formulation, packQuantity, sort }), active: !purchaseModel },
      ...plans.map((value) => ({ label: publicPurchaseModelLabels[value], href: comparisonHref({ ingredient, productType, strengthMg, formulation, packQuantity, purchaseModel: value, sort }), active: purchaseModel === value })),
    ],
  }];
  const sortGroups: FilterOptionGroup[] = [{ options: sortValues.map((value) => ({ label: sortLabels[value], href: comparisonHref({ ...filters, sort: value }), active: sort === value })) }];

  // What is applied now, each with a link that removes just that choice (removing only widens the
  // results, so the other choices stay valid).
  const applied: Omit<FilterOption, "active">[] = [
    ...(ingredient || productType ? [{ label: selectedLabel(productGroups), href: comparisonHref({ ...filters, ingredient: undefined, productType: undefined }) }] : []),
    ...(strengthMg ? [{ label: `${strengthMg}mg`, href: comparisonHref({ ...filters, strengthMg: undefined }) }] : []),
    ...(formulation ? [{ label: selectedLabel(formGroups), href: comparisonHref({ ...filters, formulation: undefined }) }] : []),
    ...(packQuantity ? [{ label: selectedLabel(packGroups), href: comparisonHref({ ...filters, packQuantity: undefined }) }] : []),
    ...(purchaseModel ? [{ label: publicPurchaseModelLabels[purchaseModel], href: comparisonHref({ ...filters, purchaseModel: undefined }) }] : []),
  ];

  return (
    <section aria-label="Filter prices" className="mt-10 rounded-3xl border border-border bg-card/80 p-5 shadow-(--shadow) backdrop-blur sm:p-6 motion-safe:animate-fade-up">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="flex items-center gap-2 font-medium"><SlidersHorizontal aria-hidden="true" className="size-4" />Filter and sort</p>
        <p className="text-sm text-muted-foreground tabular-nums">{resultCount.toLocaleString("en-GB")} price{resultCount === 1 ? "" : "s"} shown</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-flow-col xl:auto-cols-fr xl:grid-cols-none">
        <FilterDropdown label="Product" value={selectedLabel(productGroups)} selected={Boolean(ingredient || productType)} groups={productGroups} />
        <FilterDropdown label="Strength" value={selectedLabel(strengthGroups)} selected={Boolean(strengthMg)} groups={strengthGroups} />
        {forms.length > 1 || formulation ? <FilterDropdown label="Form" value={selectedLabel(formGroups)} selected={Boolean(formulation)} groups={formGroups} /> : null}
        <FilterDropdown label="Pack size" value={selectedLabel(packGroups)} selected={Boolean(packQuantity)} groups={packGroups} />
        {/* Nearly every price is one-off today, so the choice only appears once there is one to make. */}
        {plans.length > 1 || purchaseModel ? <FilterDropdown label="Buying" value={selectedLabel(planGroups)} selected={Boolean(purchaseModel)} groups={planGroups} /> : null}
        <FilterDropdown label="Sort by" value={sortLabels[sort]} selected={false} groups={sortGroups} />
      </div>
      {applied.length > 0 ? (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <ul aria-label="Applied filters" className="flex flex-wrap gap-2">
            {applied.map((item) => (
              <li key={item.href}>
                <Link href={item.href} scroll={false} aria-label={`Remove filter: ${item.label}`} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pr-2 pl-3 text-sm transition-colors hover:border-primary/50 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
                  {item.label}
                  <X aria-hidden="true" className="size-3.5 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
          <Link href={comparisonHref({ sort })} scroll={false} className="ml-auto text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline">Clear all</Link>
        </div>
      ) : null}
    </section>
  );
}
