"use client";

import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import { TableViewPagination } from "@/components/common/table-view-pagination";
import { useTableView } from "@/hooks/useTableView";
import type { ClickBreakdownRow } from "@/types/click-report";
import type { TableSorters } from "@/types/table";

const sorters = {
  label: (row) => row.label,
  clicks: (row) => row.clicks,
  share: (row) => row.share,
  lastClick: (row) => row.lastClickAt,
} satisfies TableSorters<ClickBreakdownRow>;

// One table for the marketing breakdowns of the clicks report: by area, device, browser or page.
export function ClickBreakdownTable({ rows, heading }: { rows: ClickBreakdownRow[]; heading: string }) {
  const view = useTableView(rows, sorters);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead {...view.sortProps("label")}>{heading}</TableHead>
            <TableHead {...view.sortProps("clicks")} className="text-right">Clicks</TableHead>
            <TableHead {...view.sortProps("share")} className="text-right">Share of clicks</TableHead>
            <TableHead {...view.sortProps("lastClick")}>Last click</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.rows.map((row) => (
            <TableRow key={row.key} className="hover:bg-muted/50">
              <TableCell className="max-w-md truncate font-medium" title={row.label}>{row.label}</TableCell>
              <TableCell className="text-right tabular-nums">{row.clicks}</TableCell>
              <TableCell className="text-right text-muted-foreground tabular-nums">{row.share}%</TableCell>
              <TableCell className="text-muted-foreground">{new Date(row.lastClickAt).toLocaleString("en-GB")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TableViewPagination pagination={view.pagination} />
    </>
  );
}
