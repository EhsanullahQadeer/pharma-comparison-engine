import { ArrowUp, ChevronsUpDown, Tag } from "lucide-react";

import { KeepFocus } from "@/components/common/keep-focus";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { FreshnessPill } from "@/components/ed/freshness-pill";
import { LimitedRows } from "@/components/ed/limited-rows";
import { LinkNote } from "@/components/ed/link-note";
import { PharmacyAvatar } from "@/components/ed/pharmacy-avatar";
import { PriceGridCell } from "@/components/ed/price-grid-cell";
import Link from "@/components/Link";
import { formatCheckedAgo } from "@/lib/comparison";
import { discountHeadline } from "@/lib/discounts";
import { gridColumnLabel } from "@/lib/price-grid";
import { inspectionOutcomeLabels, regulatorEntryUrls, regulatorShortLabels } from "@/lib/provider-labels";
import { formatTrustpilotScore } from "@/lib/trustpilot";
import { cn } from "@/lib/utils";
import type { PriceGrid, PriceGridRow } from "@/types/comparison";

// The pinned first column: it stays in view while the strengths scroll sideways.
export const stickyColumn = "sticky left-0 bg-card";
// Phones show this many pharmacies before "Show all".
export const PHONE_ROW_LIMIT = 20;

export function RegulatorLink({ row }: { row: PriceGridRow }) {
  return (
    <a href={regulatorEntryUrls[row.providerRegulatorType](row.providerRegulatorReference)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-6 items-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
      {regulatorShortLabels[row.providerRegulatorType]} {row.providerRegulatorReference}<span className="sr-only"> (opens the register in a new tab)</span>
    </a>
  );
}

const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "Europe/London" });

// Trustpilot: a link to the pharmacy's own Trustpilot page, with the score only while scores are
// switched on (it is null otherwise).
export function TrustpilotLink({ row, compact = false }: { row: PriceGridRow; compact?: boolean }) {
  const { trustpilotUrl, trustpilotScoreTenths, trustpilotReviewCount } = row.providerFacts;
  if (!trustpilotUrl) return null;
  const score = trustpilotScoreTenths === null ? null : formatTrustpilotScore(trustpilotScoreTenths);
  const text = score ? `${compact ? "TP" : "Trustpilot"} ${score}` : "Trustpilot reviews";
  return (
    <a href={trustpilotUrl} target="_blank" rel="nofollow noopener noreferrer" className="inline-flex min-h-6 items-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
      {text}{score && trustpilotReviewCount && !compact ? ` (${trustpilotReviewCount.toLocaleString("en-GB")})` : ""}
      <span className="sr-only"> for {row.providerName} (opens Trustpilot in a new tab)</span>
    </a>
  );
}

// Recorded facts only: a fact staff haven't recorded is simply not shown.
export function PharmacyFacts({ row }: { row: PriceGridRow }) {
  const { nextDayDelivery, discreetPackaging, inspectionOutcome, inspectionDate } = row.providerFacts;
  const chips = [nextDayDelivery && "Next day", discreetPackaging && "Discreet packaging"].filter(Boolean) as string[];
  return (
    <>
      {inspectionOutcome ? (
        <p className="text-xs text-muted-foreground">GPhC inspection: {inspectionOutcomeLabels[inspectionOutcome]}{inspectionDate ? ` · ${monthFormatter.format(inspectionDate)}` : ""}</p>
      ) : null}
      {chips.length > 0 ? (
        <ul aria-label="Delivery" className="flex flex-wrap gap-1">
          {chips.map((chip) => <li key={chip} className="rounded-full border border-border px-2 py-0.5 text-[0.6875rem]">{chip}</li>)}
        </ul>
      ) : null}
    </>
  );
}

export function DispensedBy({ row }: { row: PriceGridRow }) {
  return row.providerDispensingPartnerName ? <p className="w-fit rounded-md bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">Dispensed by {row.providerDispensingPartnerName}</p> : null;
}

// The narrow phone version of the pharmacy details: a freshness dot and its first discount code.
export function PharmacyMeta({ row, now }: { row: PriceGridRow; now: Date }) {
  const code = row.discounts.find((discount) => discount.code)?.code;
  return (
    <div className="mt-1 space-y-0.5 text-xs">
      <p className="flex items-center gap-1.5 text-muted-foreground">
        <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", row.freshness === "fresh" ? "bg-primary" : "bg-muted-foreground")} />
        <time dateTime={row.checkedAt.toISOString()}>{formatCheckedAgo(row.checkedAt, now)}</time>
      </p>
      {code ? <p className="font-semibold break-all">Code {code}</p> : null}
      {row.providerFacts.trustpilotScoreTenths !== null ? <TrustpilotLink row={row} compact /> : null}
    </div>
  );
}

type HeaderProps = { row: PriceGridRow; partner: boolean; now: Date };

function PharmacyHeader({ row, partner, now }: HeaderProps) {
  return (
    <th scope="row" className={cn(stickyColumn, "z-5 min-w-40 border-r border-border p-3 text-left align-top font-normal sm:min-w-64")}>
      <div className="flex items-start gap-3">
        <PharmacyAvatar name={row.providerName} logoUrl={row.providerLogoUrl} size="sm" className="hidden sm:flex" />
        <div className="min-w-0 space-y-1">
          <Link href={`/ed/pharmacies/${row.providerSlug}`} className="flex min-h-6 items-center font-semibold underline-offset-4 hover:underline">{row.providerName}</Link>
          <p className="flex flex-wrap items-center gap-x-2"><RegulatorLink row={row} /><TrustpilotLink row={row} /></p>
          <DispensedBy row={row} />
          <PharmacyFacts row={row} />
          <FreshnessPill freshness={row.freshness} checkedAt={row.checkedAt} now={now} compact />
          {partner ? <LinkNote /> : null}
        </div>
      </div>
    </th>
  );
}

function SwipePharmacyHeader({ row, partner, now }: HeaderProps) {
  return (
    <th scope="row" className={cn(stickyColumn, "z-5 border-r border-border p-2 text-left align-top font-normal")}>
      {/* A table cell grows to fit its content; this fixed box keeps the pinned column at 8rem. */}
      <div className="w-28 whitespace-normal">
        <Link href={`/ed/pharmacies/${row.providerSlug}`} className="flex min-h-6 items-center font-semibold wrap-break-word underline-offset-4 hover:underline">{row.providerName}</Link>
        <PharmacyMeta row={row} now={now} />
        {partner ? <LinkNote className="mt-1" /> : null}
      </div>
    </th>
  );
}

export function CurrentOffer({ row }: { row: PriceGridRow }) {
  const [first, ...rest] = row.discounts;
  if (!first) return <p className="text-xs text-muted-foreground">No current offer</p>;
  return (
    <div className="flex flex-col items-start gap-1 text-xs">
      <span className="inline-flex items-center gap-1"><Tag aria-hidden="true" className="size-3" />{discountHeadline(first)}{rest.length > 0 && ` +${rest.length}`}</span>
      <span className="text-muted-foreground">{first.eligibility}</span>
      {first.code ? <code className="rounded border border-dashed border-primary/60 px-1.5 py-0.5 font-semibold tracking-wide">{first.code}</code> : null}
      <Link href={`/ed/pharmacies/${row.providerSlug}#offers`} className="underline underline-offset-4 hover:text-muted-foreground">Terms<span className="sr-only"> for {row.providerName}&apos;s offer</span></Link>
    </div>
  );
}

// The header row's strength (or pack) columns: each a link that ranks the grid by it.
export function GridColumnHeads({ grid, sortHref, className }: { grid: PriceGrid; sortHref: (column: number) => string; className?: string }) {
  return grid.columns.map((column) => {
    const sorted = column === grid.sortColumn;
    const label = gridColumnLabel(grid.axis, column);
    return (
      <TableHead key={column} scope="col" aria-sort={sorted ? "ascending" : undefined} className={cn("text-right", className)}>
        <Link
          href={sortHref(column)}
          scroll={false}
          data-keep-focus={`grid-sort-${column}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring",
            sorted ? "bg-foreground text-background" : "text-foreground hover:bg-background",
          )}
        >
          {label}
          {sorted ? <ArrowUp aria-hidden="true" className="size-3.5" /> : <ChevronsUpDown aria-hidden="true" className="size-3.5 opacity-60" />}
          <span className="sr-only">{sorted ? ", sorted cheapest first" : `, sort by ${label}`}</span>
        </Link>
      </TableHead>
    );
  });
}

type GridLayout = "full" | "swipe";

// "full": desktop and tablet. "swipe": phone layout B — about two strength columns per screen that
// snap into place, a narrow pinned pharmacy column, no offer column, and the first 20 rows.
// "full" also drags sideways with the mouse; the phone layout already swipes.
const layouts: Record<GridLayout, { table?: string; maxHeight?: string; dragScroll: boolean; priceColumn: string; cell?: string; offerColumn: boolean; Header: (props: HeaderProps) => React.ReactNode }> = {
  full: { table: "min-w-xl", maxHeight: "75vh", dragScroll: true, priceColumn: "min-w-28", offerColumn: true, Header: PharmacyHeader },
  swipe: { dragScroll: false, priceColumn: "min-w-[calc((100vw-2rem-8rem)/2)]", cell: "snap-start", offerColumn: false, Header: SwipePharmacyHeader },
};

// One row per pharmacy, one column per strength (or pack size). Server-rendered: sorting is a link
// to the re-sorted URL, so the whole table is in the HTML. Order comes from the grid alone — partner
// status is only looked up for the link labels, after the order is fixed.
export function PriceGridTable({ grid, caption, sortHref, partnerProviderIds, now, layout = "full" }: {
  grid: PriceGrid;
  caption: string;
  sortHref: (column: number) => string;
  partnerProviderIds: ReadonlySet<string>;
  now: Date;
  layout?: GridLayout;
}) {
  const anyPack = grid.pack === "any";
  const pricing = { mode: grid.mode, fees: grid.fees, codes: grid.codes };
  const { table, maxHeight, dragScroll, priceColumn, cell: cellClass, offerColumn, Header } = layouts[layout];
  const rows = grid.rows.map((row) => {
    const partner = partnerProviderIds.has(row.providerId);
    return (
      <TableRow key={row.providerId} className="hover:bg-transparent">
        <Header row={row} partner={partner} now={now} />
        {row.cells.map((cell, cellIndex) => (
          <TableCell key={grid.columns[cellIndex]} className={cn("p-1.5 align-top", cellClass, grid.columns[cellIndex] === grid.sortColumn && "bg-muted/40")}>
            <PriceGridCell cell={cell} pricing={pricing} anyPack={anyPack} short={layout === "swipe"} />
          </TableCell>
        ))}
        {offerColumn ? <TableCell className="p-3 align-top whitespace-normal"><CurrentOffer row={row} /></TableCell> : null}
      </TableRow>
    );
  });
  return (
    <Table resizable={false} maxHeight={maxHeight} dragScroll={dragScroll} scrollLabel={`${caption}. Scroll sideways for more columns.`} className={table} frameClassName="rounded-xl">
      <TableCaption className="sr-only">{caption}<KeepFocus /></TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col" className={cn(stickyColumn, "left-0 z-20 border-r border-border bg-muted")}>Pharmacy</TableHead>
          <GridColumnHeads grid={grid} sortHref={sortHref} className={priceColumn} />
          {offerColumn ? <TableHead scope="col" className="min-w-36">Current offer</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {layout === "swipe" ? <LimitedRows limit={PHONE_ROW_LIMIT} colSpan={grid.columns.length + 1}>{rows}</LimitedRows> : rows}
      </TableBody>
    </Table>
  );
}
