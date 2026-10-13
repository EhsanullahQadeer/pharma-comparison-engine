import { Clock3, PackageSearch, Store, Tag, Wallet } from "lucide-react";
import { Suspense } from "react";

import { getPublicOffers } from "@/actions/offers/public-offers";
import { ComparisonFiltersPanel } from "@/components/ed/comparison-filters";
import { GradientText } from "@/components/ed/gradient-text";
import { LiveSummary } from "@/components/ed/live-summary";
import { NavigationPending } from "@/components/ed/navigation-pending";
import { OfferResults } from "@/components/ed/offer-results";
import { PageShell } from "@/components/ed/page-shell";
import { PricingNotes } from "@/components/ed/pricing-notes";
import { PublicEmptyState } from "@/components/ed/public-empty-state";
import { ComparisonFiltersSkeleton, ComparisonResultsSkeleton, SummarySkeleton } from "@/components/ed/skeletons";
import { StatTile } from "@/components/ed/stat-tile";
import { comparisonHref, filterOffers, formatCheckedAgo, isRankable, parseComparisonFilters } from "@/lib/comparison";
import { formatPence } from "@/lib/money";
import { parsePageSize } from "@/lib/pagination";
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

async function Summary({ offers }: Pick<SectionProps, "offers">) {
  return <LiveSummary offers={await offers} now={new Date()} />;
}

async function Filters({ offers, filters }: SectionProps) {
  const allOffers = await offers;
  return allOffers.length > 0 ? <ComparisonFiltersPanel offers={allOffers} filters={filters} /> : null;
}

async function Results({ offers: offersPromise, filters, page }: SectionProps & { page: ResultsPage }) {
  const allOffers = await offersPromise;
  if (allOffers.length === 0) {
    return (
      <PublicEmptyState
        icon={PackageSearch}
        title="Prices are being checked"
        description="We only show prices after checking each pharmacy's registration and the price on its own website. The first verified prices will appear here soon."
        action={{ href: "/ed/pharmacies", label: "Browse pharmacies" }}
      />
    );
  }
  const offers = filterOffers(allOffers, filters);
  if (offers.length === 0) {
    return <PublicEmptyState icon={PackageSearch} title="No prices match these filters" description="Try another product, strength, form or pack size, or clear the filters to see every current price." action={{ href: comparisonHref({ sort: filters.sort }), label: "Clear filters" }} />;
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
      aside={<Suspense fallback={<SummarySkeleton />}><Summary offers={offers} /></Suspense>}
    >
      <Suspense fallback={<ComparisonFiltersSkeleton />}>
        <Filters offers={offers} filters={filters} />
      </Suspense>
      <NavigationPending fallback={<ComparisonResultsSkeleton />}>
        <Suspense key={`${comparisonHref(filters)}#${page.number}/${page.size}`} fallback={<ComparisonResultsSkeleton />}>
          <Results offers={offers} filters={filters} page={page} />
        </Suspense>
      </NavigationPending>
      <PricingNotes />
    </PageShell>
  );
}
