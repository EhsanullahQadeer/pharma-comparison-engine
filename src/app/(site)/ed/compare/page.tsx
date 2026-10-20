import { Clock3, PackageSearch, Store, Tag, Wallet } from "lucide-react";
import { Suspense } from "react";

import { getPublicOffers } from "@/actions/offers/public-offers";
import { ComparisonFiltersPanel } from "@/components/ed/comparison-filters";
import { GradientText } from "@/components/ed/gradient-text";
import { LiveSummary } from "@/components/ed/live-summary";
import { NavigationPending } from "@/components/ed/navigation-pending";
import { OfferResults } from "@/components/ed/offer-results";
import { PageShell } from "@/components/ed/page-shell";
import { Segmented, type GridProductTab } from "@/components/ed/price-grid-controls";
import { PriceGridSection } from "@/components/ed/price-grid-section";
import { PricingNotes } from "@/components/ed/pricing-notes";
import { PublicEmptyState } from "@/components/ed/public-empty-state";
import { ComparisonFiltersSkeleton, ComparisonResultsSkeleton, PriceGridSkeleton, SummarySkeleton } from "@/components/ed/skeletons";
import { StatTile } from "@/components/ed/stat-tile";
import { ingredientLabels } from "@/lib/catalogue-labels";
import { comparisonHref, filterOffers, formatCheckedAgo, isRankable, parseComparisonFilters } from "@/lib/comparison";
import { edProducts, gridProduct, productOffers } from "@/lib/ed-products";
import { formatPence } from "@/lib/money";
import { parsePageSize } from "@/lib/pagination";
import { priceAlertOptions } from "@/lib/price-alerts";
import { gridFromFilters, gridOffers, gridState } from "@/lib/price-grid";
import { pomPricingRobots } from "@/lib/seo";
import type { ComparisonFilters, PublicOffer } from "@/types/comparison";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare ED treatment prices from UK pharmacies",
  description: "Compare Viagra, Cialis and generic sildenafil and tadalafil prices from registered UK online pharmacies — total cost including delivery and consultation, price per tablet, and when each price was last checked.",
  // Filter/sort variants all canonicalise to the filter-less page (SEO rule 2).
  alternates: { canonical: "/ed/compare" },
  robots: pomPricingRobots,
};

const crumbs = [{ label: "Home", href: "/" }, { label: "Prices", href: "/ed/prices/sildenafil" }];

type SectionProps = { offers: Promise<PublicOffer[]>; filters: ComparisonFilters };
type ResultsPage = { number: number; size: number };

function parseResultsPage(params: Record<string, string | string[] | undefined>): ResultsPage {
  const number = typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;
  return { number: Number.isInteger(number) && number > 0 ? number : 1, size: parsePageSize(typeof params.pageSize === "string" ? params.pageSize : undefined) };
}

// The grid's product and cells for this URL. Pure, so the summary card and the grid can each
// build it and still show the same figures.
function compareGrid(offers: PublicOffer[], filters: ComparisonFilters, now: Date) {
  const product = gridProduct(offers, filters);
  const offersForProduct = productOffers(offers, product);
  return { product, offersForProduct, grid: gridFromFilters(offersForProduct, filters, now) };
}

// In grid view the card counts only the prices in the grid, so it never disagrees with it.
async function Summary({ offers, filters }: SectionProps) {
  const allOffers = await offers;
  const now = new Date();
  return <LiveSummary offers={filters.view === "list" ? allOffers : gridOffers(compareGrid(allOffers, filters, now).grid.rows)} now={now} />;
}

async function Filters({ offers, filters }: SectionProps) {
  const allOffers = await offers;
  return allOffers.length > 0 ? <ComparisonFiltersPanel offers={allOffers} filters={filters} /> : null;
}

function ViewSwitch({ filters }: { filters: ComparisonFilters }) {
  const product = { ingredient: filters.ingredient, productType: filters.productType };
  return (
    <div className="mt-10">
      <Segmented
        label="View"
        options={[
          { label: "Price grid", href: comparisonHref(product), active: filters.view !== "list" },
          { label: "All prices", href: comparisonHref({ ...product, view: "list" }), active: filters.view === "list" },
        ]}
      />
    </div>
  );
}

async function GridResults({ offers: offersPromise, filters }: SectionProps) {
  const offers = await offersPromise;
  if (offers.length === 0) return <NoPricesYet />;
  const now = new Date();
  const { product, offersForProduct, grid } = compareGrid(offers, filters, now);
  const state = gridState(filters);
  // A product tab keeps the price mode and fees choice; its packs and strengths are its own.
  const tabs: GridProductTab[] = edProducts
    .filter((entry) => entry === product || productOffers(offers, entry).length > 0)
    .map((entry) => ({
      slug: entry.slug,
      label: entry.name,
      group: ingredientLabels[entry.ingredient],
      href: comparisonHref({ ingredient: entry.ingredient, productType: entry.typeSlug, mode: state.mode, medicineOnly: state.medicineOnly }),
      active: entry === product,
    }));
  const href = (patch: Partial<ComparisonFilters>) => comparisonHref({ ingredient: product.ingredient, productType: product.typeSlug, ...state, ...patch });
  return <PriceGridSection grid={grid} product={product} tabs={tabs} href={href} filters={filters} productHasPrices={offersForProduct.length > 0} alertOptions={priceAlertOptions(offersForProduct)} placement="COMPARE" now={now} />;
}

function NoPricesYet() {
  return (
    <PublicEmptyState
      icon={PackageSearch}
      title="Prices are being checked"
      description="We only show prices after checking each pharmacy's registration and the price on its own website. The first verified prices will appear here soon."
      action={{ href: "/ed/pharmacies", label: "Browse pharmacies" }}
    />
  );
}

async function Results({ offers: offersPromise, filters, page }: SectionProps & { page: ResultsPage }) {
  const allOffers = await offersPromise;
  if (allOffers.length === 0) return <NoPricesYet />;
  const offers = filterOffers(allOffers, filters);
  if (offers.length === 0) {
    return <PublicEmptyState icon={PackageSearch} title="No prices match these filters" description="Try another product, strength, form or pack size, or clear the filters to see every current price." action={{ href: comparisonHref({ sort: filters.sort, view: "list" }), label: "Clear filters" }} />;
  }
  const rankable = offers.filter(isRankable);
  const statsBase = rankable.length > 0 ? rankable : offers;
  const now = new Date();

  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile index={0} icon={Tag} label="Lowest per tablet" value={formatPence(Math.min(...statsBase.map((offer) => offer.perTabletPence)))} />
        <StatTile index={1} icon={Wallet} label="Lowest total" value={formatPence(Math.min(...statsBase.map((offer) => offer.deliveredTotalPence)))} />
        <StatTile index={2} icon={Store} label="Pharmacies" value={String(new Set(offers.map((offer) => offer.providerId)).size)} hint={`${offers.length} price${offers.length === 1 ? "" : "s"} in view`} />
        <StatTile index={3} icon={Clock3} label="Latest check" value={formatCheckedAgo(new Date(Math.max(...offers.map((offer) => offer.checkedAt.getTime()))), now)} />
      </div>
      <OfferResults offers={offers} sort={filters.sort} now={now} placement="COMPARE" layout="table" page={page} />
    </>
  );
}

// The page frame renders without waiting for prices, and each part that needs them streams in on
// its own. A filter or sort link then keeps the heading and the filter card on screen and replaces
// only the results with their skeleton: NavigationPending from the click, the keyed boundary from
// the moment the new URL is on screen until its prices arrive.
export default async function ComparePage(props: PageProps<"/ed/compare">) {
  const params = await props.searchParams;
  const filters = parseComparisonFilters(params);
  const page = parseResultsPage(params);
  // One read, shared by the three sections below.
  const offers = getPublicOffers();

  return (
    <PageShell
      title="Compare ED treatment prices"
      heading={<>Compare ED treatment prices, <GradientText>total cost included.</GradientText></>}
      eyebrow="Prices / Compare costs"
      description="Viagra, Cialis and generic prices from registered UK pharmacies, with delivery and consultation charges added in and the time each price was last checked."
      crumbs={crumbs}
      aside={<Suspense key={comparisonHref(filters)} fallback={<SummarySkeleton />}><Summary offers={offers} filters={filters} /></Suspense>}
    >
      <ViewSwitch filters={filters} />
      {filters.view === "list" ? (
        <>
          <Suspense fallback={<ComparisonFiltersSkeleton />}>
            <Filters offers={offers} filters={filters} />
          </Suspense>
          <NavigationPending fallback={<ComparisonResultsSkeleton />}>
            <Suspense key={`${comparisonHref(filters)}#${page.number}/${page.size}`} fallback={<ComparisonResultsSkeleton />}>
              <Results offers={offers} filters={filters} page={page} />
            </Suspense>
          </NavigationPending>
        </>
      ) : (
        <NavigationPending fallback={<PriceGridSkeleton />}>
          <Suspense key={comparisonHref(filters)} fallback={<PriceGridSkeleton />}>
            <GridResults offers={offers} filters={filters} />
          </Suspense>
        </NavigationPending>
      )}
      <PricingNotes />
    </PageShell>
  );
}
