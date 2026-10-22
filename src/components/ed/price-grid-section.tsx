import { PackageSearch } from "lucide-react";

import { getPartnerProviderIds } from "@/actions/referrals/outbound-links";
import { CopyViewLink } from "@/components/ed/copy-view-link";
import { GridLayoutBeacon } from "@/components/ed/grid-layout-beacon";
import { PriceAlertModal } from "@/components/ed/price-alert-modal";
import { PriceGridTable } from "@/components/ed/price-grid";
import { GridProductTabs, PriceGridControls, type GridProductTab } from "@/components/ed/price-grid-controls";
import { PriceGridFilters } from "@/components/ed/price-grid-filters";
import { PriceGridKey } from "@/components/ed/price-grid-key";
import { PriceGridPhoneCompact } from "@/components/ed/price-grid-phone-compact";
import { PriceGridSearch } from "@/components/ed/price-grid-search";
import { PriceRangeBlock } from "@/components/ed/price-range-block";
import { PublicEmptyState } from "@/components/ed/public-empty-state";
import { SwipeFrame } from "@/components/ed/swipe-frame";
import Link from "@/components/Link";
import type { ReferralPlacement } from "@/generated/prisma/client";
import { formatCheckedDateTime } from "@/lib/comparison";
import { mailerConfigured } from "@/lib/mailer";
import { scheduledPhoneLayout } from "@/lib/phone-layout";
import { alertTargetKey } from "@/lib/price-alerts";
import { activeGridFilterCount, gridDescription, gridFilterFlags, gridFiltered, gridOffers } from "@/lib/price-grid";
import { showTrustpilotScores } from "@/lib/trustpilot";
import { cn } from "@/lib/utils";
import type { ComparisonFilters, EdProduct, GridFilterFlags, PhoneGridLayout, PriceGrid } from "@/types/comparison";
import type { PriceAlertOption } from "@/types/price-alerts";

import type { ComponentProps } from "react";

type HrefFor = (patch: Partial<ComparisonFilters>) => string;
// The compact phone layout needs everything the grid table does, plus where its "View" links count from.
type TableProps = ComponentProps<typeof PriceGridPhoneCompact>;

// Phone A/B test: the layout alternates week by week for everyone (src/lib/phone-layout.ts), so
// nothing is stored on visitors' devices and no consent is needed. `?layout=` previews either one
// without being counted.

const phoneGrids: Record<PhoneGridLayout, (props: TableProps) => React.ReactNode> = {
  compact: (props) => <PriceGridPhoneCompact {...props} />,
  swipe: (props) => (
    <SwipeFrame hint={`Swipe the table sideways for every ${props.grid.axis === "strength" ? "strength" : "pack size"}`} pages={Math.ceil(props.grid.columns.length / 2)}>
      <PriceGridTable {...props} layout="swipe" />
    </SwipeFrame>
  ),
};

// Every drawer filter switched off, plus the one-off/subscription choice.
const noFilters: Required<GridFilterFlags> & Pick<ComparisonFilters, "purchaseModel" | "region" | "payment" | "minTrustpilot"> = {
  inStock: false, freeDelivery: false, noConsultation: false, verifiedOnly: false, hasDiscount: false, nextDay: false, discreet: false, inspectionPassed: false,
  purchaseModel: undefined, region: undefined, payment: undefined, minTrustpilot: undefined,
};

// The three filters shoppers reach for most, one tap each, beside the full drawer.
const quickFilters: { key: keyof GridFilterFlags; label: string }[] = [
  { key: "inStock", label: "In stock" },
  { key: "freeDelivery", label: "Free delivery" },
  { key: "hasDiscount", label: "Has a discount" },
];

function QuickFilters({ filters, href }: { filters: ComparisonFilters; href: HrefFor }) {
  return (
    <ul aria-label="Quick filters" className="flex flex-wrap gap-2">
      {quickFilters.map(({ key, label }) => (
        <li key={key}>
          <Link
            href={href({ [key]: !filters[key] })}
            scroll={false}
            aria-current={filters[key] ? "true" : undefined}
            className={cn("inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring", filters[key] ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted")}
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

// The grid view of one product: tabs, options, price range, search and filters, the grid and its
// key. Every link it builds goes through `href`, so the page decides where the state lives.
export async function PriceGridSection({ grid, product, tabs, href, filters, productHasPrices, alertOptions, placement, now }: {
  grid: PriceGrid;
  product: EdProduct;
  tabs: GridProductTab[];
  href: HrefFor;
  filters: ComparisonFilters;
  // Whether the product has any price at all, before filters (an empty grid means two different things).
  productHasPrices: boolean;
  // Strength × pack choices for the price-alert sign-up (the product's current prices).
  alertOptions: PriceAlertOption[];
  placement: ReferralPlacement;
  now: Date;
}) {
  const partners = await getPartnerProviderIds();
  const description = gridDescription(grid, product.name);
  const flags = gridFilterFlags(filters);
  const activeCount = activeGridFilterCount(filters);
  const showTrustpilot = showTrustpilotScores();
  // The sign-up opens on the ranked column in the pack on screen.
  const alertTargets = {
    strength: (column: number) => alertTargetKey(column, typeof grid.pack === "number" ? grid.pack : 0),
    pack: (column: number) => alertTargetKey(alertOptions[0]?.strengthMg ?? 0, column),
  };
  const alertTarget = grid.sortColumn === null ? undefined : alertTargets[grid.axis](grid.sortColumn);
  const clearFilters = href(noFilters);
  // "With code" is only offered when some price on screen has a code to apply.
  const hasCodes = grid.codes || gridOffers(grid.rows).some((offer) => offer.discountedTotalPence !== null);
  const tableProps: TableProps = { grid, caption: description, sortHref: (column) => href({ column }), placement, partnerProviderIds: partners, now };
  const phoneLayout = filters.layout ?? scheduledPhoneLayout(now, process.env.PRICE_GRID_PHONE_LAYOUT);

  if (!productHasPrices) {
    return (
      <section aria-labelledby="price-grid-heading" className="mt-10">
        <h2 id="price-grid-heading" className="text-2xl font-semibold">{product.name} prices</h2>
        <GridProductTabs tabs={tabs} />
        <PublicEmptyState icon={PackageSearch} title={`${product.name} prices are being checked`} description="Verified prices will appear here once pharmacies and their prices have been checked." action={{ href: "/ed/pharmacies", label: "Browse pharmacies" }} />
      </section>
    );
  }

  return (
    <section aria-labelledby="price-grid-heading" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h2 id="price-grid-heading" className="text-2xl font-semibold">{product.name} prices</h2>
        {grid.latestCheckedAt ? (
          <p className="text-right text-sm text-muted-foreground">
            <span className="mr-1.5 inline-block size-2 rounded-full bg-primary" aria-hidden="true" />
            Prices last checked <time dateTime={grid.latestCheckedAt.toISOString()}>{formatCheckedDateTime(grid.latestCheckedAt)}</time>
            <br />Ranked by price only. Partners never move up.
          </p>
        ) : null}
      </div>
      <GridProductTabs tabs={tabs} />
      <PriceGridControls grid={grid} href={href} hasCodes={hasCodes} />
      {grid.columns.length > 0 ? <PriceRangeBlock grid={grid} /> : null}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <PriceGridSearch baseHref={href({ query: undefined })} query={filters.query} />
        <QuickFilters filters={filters} href={href} />
        <PriceGridFilters baseHref={clearFilters} current={{ ...flags, purchaseModel: filters.purchaseModel, region: filters.region, payment: filters.payment, minTrustpilot: filters.minTrustpilot }} activeCount={activeCount} showTrustpilot={showTrustpilot} />
        {activeCount > 0 ? <Link href={clearFilters} scroll={false} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Clear filters</Link> : null}
        <CopyViewLink />
        {mailerConfigured() && alertOptions.length > 0 ? <PriceAlertModal productSlug={product.slug} productName={product.name} options={alertOptions} defaultTarget={alertTarget} /> : null}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{description} · {grid.rows.length} pharmac{grid.rows.length === 1 ? "y" : "ies"}</p>
      <div className="mt-4">
        {grid.rows.length > 0 ? (
          <>
            <div className="hidden sm:block"><PriceGridTable {...tableProps} /></div>
            <div className="sm:hidden">{phoneGrids[phoneLayout](tableProps)}</div>
            {filters.layout ? null : <GridLayoutBeacon layout={phoneLayout} />}
          </>
        ) : (
          <p className="rounded-3xl border border-dashed border-border bg-card/60 px-6 py-12 text-center text-sm text-muted-foreground">
            {gridFiltered(filters) ? "No prices match these filters." : "No pharmacies match that name."}{" "}
            <Link href={href({ ...noFilters, query: undefined })} scroll={false} className="underline underline-offset-4 hover:text-foreground">Clear search and filters</Link>
          </p>
        )}
      </div>
      <PriceGridKey />
    </section>
  );
}
