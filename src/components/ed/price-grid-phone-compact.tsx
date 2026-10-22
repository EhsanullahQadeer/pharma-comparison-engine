import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/common/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { ExpandableGridRow } from "@/components/ed/expandable-grid-row";
import { LimitedRows } from "@/components/ed/limited-rows";
import { LinkNote } from "@/components/ed/link-note";
import { OutboundLink } from "@/components/ed/outbound-link";
import { CurrentOffer, DispensedBy, GridColumnHeads, PHONE_ROW_LIMIT, PharmacyFacts, PharmacyMeta, RegulatorLink, stickyColumn, TrustpilotLink } from "@/components/ed/price-grid";
import { PriceChange } from "@/components/ed/price-grid-cell";
import { WasPrice } from "@/components/ed/was-price";
import type { ReferralPlacement } from "@/generated/prisma/client";
import { formatCheckedAgo } from "@/lib/comparison";
import { formatPence } from "@/lib/money";
import { gridColumnLabel, gridValuePence, type GridPricing } from "@/lib/price-grid";
import { cn } from "@/lib/utils";
import type { GridCell, PriceGrid, PriceGridRow } from "@/types/comparison";

// Phone layout A: every column on screen, one figure and at most one label per cell. Tapping a
// pharmacy opens its detail row, which is where the links to the pharmacy are.
function CompactCell({ cell }: { cell: GridCell }) {
  if (cell.kind === "not-sold") return <span className="text-muted-foreground">–<span className="sr-only">Not stocked</span></span>;
  if (cell.kind === "out-of-stock") return <span className="text-xs text-muted-foreground">Sold out</span>;
  const { offer } = cell;
  return (
    <span className="flex flex-col items-center gap-0.5">
      <span className="text-sm font-semibold tabular-nums">{formatPence(cell.valuePence)}{offer.feesVerified ? null : <><span aria-hidden="true">*</span><span className="sr-only">, indicative</span></>}</span>
      {cell.lowest ? <span className="text-[0.6875rem] font-semibold">Lowest</span> : null}
      {!cell.lowest && offer.priceChangePence !== null ? <PriceChange pence={offer.priceChangePence} /> : null}
    </span>
  );
}

function DetailLine({ cell, label, pricing, placement, rank, partner, providerName }: { cell: GridCell; label: string; pricing: GridPricing; placement: ReferralPlacement; rank: number; partner: boolean; providerName: string }) {
  if (cell.kind !== "price") return null;
  const { offer } = cell;
  const total = gridValuePence(offer, { ...pricing, mode: "total" });
  const perTablet = gridValuePence(offer, { ...pricing, mode: "tablet" });
  const change = offer.priceChangePence === null ? "" : ` · ${offer.priceChangePence < 0 ? "↓" : "↑"}${formatPence(Math.abs(offer.priceChangePence))} since last check`;
  return (
    <li className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-0">
      <div>
        <p className="font-semibold">{label} × {offer.variant.packQuantity}</p>
        <p className="text-xs text-muted-foreground tabular-nums">{formatPence(total)}{offer.feesVerified ? "" : "*"} total · {formatPence(perTablet)} per tablet{change}</p>
        {offer.wasPricePence !== null ? <p className="text-xs">Sale: medicine {formatPence(offer.itemPricePence)}, <WasPrice pence={offer.wasPricePence} /></p> : null}
      </div>
      <Button
        size="sm"
        className="rounded-full"
        nativeButton={false}
        render={
          <OutboundLink offer={offer} placement={placement} partner={partner} rank={rank} layout="compact">
            View<ArrowUpRight aria-hidden="true" className="size-4" />
            <span className="sr-only"> {label} at {providerName} (opens in a new tab)</span>
          </OutboundLink>
        }
      />
    </li>
  );
}

function RowDetail({ row, grid, pricing, placement, rank, partner, now }: { row: PriceGridRow; grid: PriceGrid; pricing: GridPricing; placement: ReferralPlacement; rank: number; partner: boolean; now: Date }) {
  return (
    <div className="space-y-3">
      <ul>
        {row.cells.map((cell, index) => (
          <DetailLine key={grid.columns[index]} cell={cell} label={gridColumnLabel(grid.axis, grid.columns[index])} pricing={pricing} placement={placement} rank={rank} partner={partner} providerName={row.providerName} />
        ))}
      </ul>
      <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        <RegulatorLink row={row} /> · checked <time dateTime={row.checkedAt.toISOString()}>{formatCheckedAgo(row.checkedAt, now)}</time>
        <TrustpilotLink row={row} />
      </p>
      <DispensedBy row={row} />
      <PharmacyFacts row={row} />
      <CurrentOffer row={row} />
      {partner ? <LinkNote /> : null}
    </div>
  );
}

export function PriceGridPhoneCompact({ grid, caption, sortHref, placement, partnerProviderIds, now }: {
  grid: PriceGrid;
  caption: string;
  sortHref: (column: number) => string;
  placement: ReferralPlacement;
  partnerProviderIds: ReadonlySet<string>;
  now: Date;
}) {
  const pricing = { mode: grid.mode, fees: grid.fees, codes: grid.codes };
  const colSpan = grid.columns.length + 1;
  return (
    <Table resizable={false} frameClassName="rounded-xl">
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col" className={cn(stickyColumn, "z-20 border-r border-border bg-muted px-2")}>Pharmacy</TableHead>
          <GridColumnHeads grid={grid} sortHref={sortHref} className="px-0.5 text-center [&_a]:px-1.5" />
        </TableRow>
      </TableHeader>
      <TableBody>
        <LimitedRows limit={PHONE_ROW_LIMIT} colSpan={colSpan}>
          {grid.rows.map((row, index) => {
            const partner = partnerProviderIds.has(row.providerId);
            return (
              <ExpandableGridRow
                key={row.providerId}
                id={`grid-detail-${row.providerId}`}
                name={row.providerName}
                meta={<PharmacyMeta row={row} now={now} />}
                colSpan={colSpan}
                defaultOpen={index === 0}
                cells={row.cells.map((cell, cellIndex) => (
                  <TableCell key={grid.columns[cellIndex]} className={cn("px-0.5 py-2 text-center align-top", grid.columns[cellIndex] === grid.sortColumn && "bg-muted/40", cell.kind === "price" && cell.lowest && "bg-primary/10")}>
                    <CompactCell cell={cell} />
                  </TableCell>
                ))}
                detail={<RowDetail row={row} grid={grid} pricing={pricing} placement={placement} rank={index + 1} partner={partner} now={now} />}
              />
            );
          })}
        </LimitedRows>
      </TableBody>
    </Table>
  );
}
