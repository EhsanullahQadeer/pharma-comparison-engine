import { ArrowRight, BookOpen, PackageSearch, Pill, type LucideIcon } from "lucide-react";

import { getPublicOffers } from "@/actions/offers/public-offers";
import { GradientText } from "@/components/ed/gradient-text";
import { LiveSummary } from "@/components/ed/live-summary";
import { OfferResults } from "@/components/ed/offer-results";
import { PageShell } from "@/components/ed/page-shell";
import type { GridProductTab } from "@/components/ed/price-grid-controls";
import { PriceGridSection } from "@/components/ed/price-grid-section";
import { PricingNotes } from "@/components/ed/pricing-notes";
import { PublicEmptyState } from "@/components/ed/public-empty-state";
import { VariantPriceCard } from "@/components/ed/variant-price-card";
import Link from "@/components/Link";
import type { Ingredient } from "@/generated/prisma/client";
import { ingredientLabels, ingredientSlugs } from "@/lib/catalogue-labels";
import { comparisonHref, summarizeVariants } from "@/lib/comparison";
import { edHref } from "@/lib/ed-pages";
import { edProducts, productOffers, productPath } from "@/lib/ed-products";
import { formatPence } from "@/lib/money";
import { priceAlertOptions } from "@/lib/price-alerts";
import { gridFromFilters, gridOffers, gridState } from "@/lib/price-grid";
import type { ComparisonFilters, EdProduct, PublicOffer } from "@/types/comparison";

import type { ReactNode } from "react";

export const ingredientPageCopy: Record<Ingredient, { description: string; other: Ingredient }> = {
  SILDENAFIL: {
    description: "Sildenafil prices, including branded Viagra, from registered UK pharmacies. Every strength and pack size, with delivery and consultation costs added in.",
    other: "TADALAFIL",
  },
  TADALAFIL: {
    description: "Tadalafil prices, including branded Cialis and daily-dose packs, from registered UK pharmacies. Every strength and pack size, with delivery and consultation costs added in.",
    other: "SILDENAFIL",
  },
};

const TOP_OFFERS = 5;

type PageLink = { href: string; icon: LucideIcon; title: string; body: string };

function LinkCards({ links }: { links: PageLink[] }) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {links.map(({ href, icon: Icon, title, body }) => (
        <Link key={href} href={href} className="group flex items-start gap-4 rounded-3xl border border-border p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 transition-transform group-hover:scale-110"><Icon aria-hidden="true" className="size-5" /></span>
          <span><span className="block font-medium">{title}</span><span className="mt-1 block text-sm text-muted-foreground">{body}</span></span>
        </Link>
      ))}
    </div>
  );
}

// A link to one product's own price page. With `offers` it states what is on record; without, it
// carries no price — a pharmacy medicine's page is open to search engines, so it must not quote a
// prescription-only sibling's price.
function productLink(product: EdProduct, offers?: PublicOffer[]): PageLink {
  const link = { href: edHref(productPath(product)), icon: Pill, title: `${product.name} prices` };
  if (!offers) return { ...link, body: "Its prices by strength and pack size." };
  const count = offers.length;
  const body = count > 0
    ? `${count} price${count === 1 ? "" : "s"} on record, from ${formatPence(Math.min(...offers.map((offer) => offer.perTabletPence)))} per tablet.`
    : "No prices on record yet.";
  return { ...link, body };
}

const explainedLink = (ingredient: Ingredient): PageLink => ({
  href: `/ed/treatments/${ingredientSlugs[ingredient]}`,
  icon: BookOpen,
  title: `${ingredientLabels[ingredient]} explained`,
  body: "A plain-English introduction to discuss with a pharmacist or prescriber.",
});

// The shared body of a price page, for one medicine or for one product of it. A product page passes
// its price grid, which replaces the strength cards and the top-prices list.
function PricesView({ label, description, note, offers, compareHref, products, related, now, grid, summaryOffers = offers }: {
  label: string;
  description: string;
  note?: string;
  offers: PublicOffer[];
  compareHref: string;
  // Product pages to choose from, shown above the strengths (medicine pages only).
  products?: PageLink[];
  related: PageLink[];
  now: Date;
  grid?: ReactNode;
  // What the summary card counts: the grid's own prices when there is a grid.
  summaryOffers?: PublicOffer[];
}) {
  const summaries = summarizeVariants(offers);
  return (
    <PageShell
      title={`${label} prices`}
      heading={<>{label} prices, <GradientText>side by side.</GradientText></>}
      eyebrow="Prices / Compare costs"
      description={description}
      crumbs={[{ label: "Home", href: "/" }, { label: "Compare prices", href: "/ed/compare" }]}
      aside={<LiveSummary offers={summaryOffers} now={now} />}
    >
      {note ? <p className="mt-6 max-w-3xl rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">{note}</p> : null}
      {products ? (
        <section aria-labelledby="products-heading" className="mt-12">
          <h2 id="products-heading" className="text-2xl font-semibold">Choose a product</h2>
          <p className="mt-2 text-sm text-muted-foreground">Branded and generic versions are priced separately. Pick one to see only its prices.</p>
          <LinkCards links={products} />
        </section>
      ) : null}
      {grid ?? (offers.length === 0 ? (
        <div className="mt-12">
          <PublicEmptyState icon={PackageSearch} title={`${label} prices are being checked`} description="Verified prices will appear here once pharmacies and their prices have been checked." action={{ href: "/ed/pharmacies", label: "Browse pharmacies" }} />
        </div>
      ) : (
        <>
          <section aria-labelledby="variants-heading" className="mt-12">
            <h2 id="variants-heading" className="text-2xl font-semibold">Choose a strength and pack</h2>
            <p className="mt-2 text-sm text-muted-foreground">Lowest total for each option. Pick one to compare every pharmacy&apos;s price for it.</p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {summaries.map((summary, index) => <VariantPriceCard key={summary.variant.id} summary={summary} index={index} />)}
            </ul>
          </section>
          <OfferResults offers={offers} sort="tablet" now={now} placement="INGREDIENT_PRICES" limit={TOP_OFFERS} />
          <Link href={compareHref} className="group mt-6 inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline">
            See all {offers.length} {label} prices<ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </>
      ))}
      <section aria-labelledby="related-heading" className="mt-16">
        <h2 id="related-heading" className="text-2xl font-semibold">Keep exploring</h2>
        <LinkCards links={related} />
      </section>
      <PricingNotes />
    </PageShell>
  );
}

export async function IngredientPricesView({ ingredient }: { ingredient: Ingredient }) {
  const offers = (await getPublicOffers()).filter((offer) => offer.variant.ingredient === ingredient);
  const { description, other } = ingredientPageCopy[ingredient];
  return (
    <PricesView
      label={ingredientLabels[ingredient]}
      description={description}
      offers={offers}
      compareHref={comparisonHref({ ingredient })}
      products={edProducts.filter((product) => product.ingredient === ingredient).map((product) => productLink(product, productOffers(offers, product)))}
      related={[
        { href: `/ed/prices/${ingredientSlugs[other]}`, icon: Pill, title: `${ingredientLabels[other]} prices`, body: `Compare every ${ingredientLabels[other].toLowerCase()} strength and pack.` },
        explainedLink(ingredient),
      ]}
      now={new Date()}
    />
  );
}

export async function ProductPricesView({ product, filters }: { product: EdProduct; filters: ComparisonFilters }) {
  const allOffers = await getPublicOffers();
  const offers = productOffers(allOffers, product);
  const siblings = edProducts.filter((other) => other.ingredient === product.ingredient && other.slug !== product.slug);
  const now = new Date();
  const grid = gridFromFilters(offers, filters, now);
  const state = gridState(filters);
  const path = edHref(productPath(product));
  // Tabs are the product pages themselves; each keeps the price mode and fees choice.
  const tabs: GridProductTab[] = edProducts
    .filter((entry) => entry === product || productOffers(allOffers, entry).length > 0)
    .map((entry) => ({
      slug: entry.slug,
      label: entry.name,
      group: ingredientLabels[entry.ingredient],
      href: comparisonHref({ mode: state.mode, medicineOnly: state.medicineOnly }, edHref(productPath(entry))),
      active: entry === product,
    }));
  return (
    <PricesView
      label={product.name}
      description={product.description}
      note={product.legalNote}
      offers={offers}
      compareHref={comparisonHref({ ingredient: product.ingredient, productType: product.typeSlug })}
      related={[...siblings.map((other) => productLink(other)), explainedLink(product.ingredient)]}
      now={now}
      summaryOffers={gridOffers(grid.rows)}
      grid={<PriceGridSection grid={grid} product={product} tabs={tabs} href={(patch) => comparisonHref({ ...state, ...patch }, path)} filters={filters} productHasPrices={offers.length > 0} alertOptions={priceAlertOptions(offers)} placement="INGREDIENT_PRICES" now={now} />}
    />
  );
}
