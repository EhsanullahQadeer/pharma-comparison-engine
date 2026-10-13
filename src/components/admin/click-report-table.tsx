"use client";

import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import { TableViewPagination } from "@/components/common/table-view-pagination";
import Link from "@/components/Link";
import { useTableView } from "@/hooks/useTableView";
import { formatPence } from "@/lib/money";
import type { ClickReportRow } from "@/types/click-report";
import type { TableSorters } from "@/types/table";

const sorters = {
  pharmacy: (row) => row.pharmacy?.name,
  product: (row) => row.product?.name,
  clicks: (row) => row.clicks,
  share: (row) => row.share,
  averagePrice: (row) => row.averagePricePence,
  lastClick: (row) => row.lastClickAt,
} satisfies TableSorters<ClickReportRow>;

// One table for all three breakdowns of the clicks report: by pharmacy, by product, or both.
export function ClickReportTable({ rows, showPharmacy = false, showProduct = false }: { rows: ClickReportRow[]; showPharmacy?: boolean; showProduct?: boolean }) {
  const view = useTableView(rows, sorters);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {showPharmacy ? <TableHead {...view.sortProps("pharmacy")}>Pharmacy</TableHead> : null}
            {showProduct ? <TableHead {...view.sortProps("product")}>Product</TableHead> : null}
            <TableHead {...view.sortProps("clicks")} className="text-right">Clicks</TableHead>
            <TableHead {...view.sortProps("share")} className="text-right">Share of clicks</TableHead>
            {showProduct ? <TableHead {...view.sortProps("averagePrice")} className="text-right">Average price shown</TableHead> : null}
            <TableHead {...view.sortProps("lastClick")}>Last click</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.rows.map((row) => (
            <TableRow key={row.key} className="hover:bg-muted/50">
              {showPharmacy && row.pharmacy ? (
                <TableCell className="font-medium">
                  <Link href={`/admin/pharmacies/${row.pharmacy.id}`} className="hover:underline">{row.pharmacy.name}</Link>
                </TableCell>
              ) : null}
              {showProduct && row.product ? (
                <TableCell>
                  <span className={showPharmacy ? undefined : "font-medium"}>{row.product.name}</span>
                  {row.product.note ? <span className="ml-2 text-xs text-muted-foreground">{row.product.note}</span> : null}
                </TableCell>
              ) : null}
              <TableCell className="text-right tabular-nums">{row.clicks}</TableCell>
              <TableCell className="text-right text-muted-foreground tabular-nums">{row.share}%</TableCell>
              {showProduct ? <TableCell className="text-right tabular-nums">{row.averagePricePence === null ? "–" : formatPence(row.averagePricePence)}</TableCell> : null}
              <TableCell className="text-muted-foreground">{new Date(row.lastClickAt).toLocaleString("en-GB")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TableViewPagination pagination={view.pagination} />
    </>
  );
}
