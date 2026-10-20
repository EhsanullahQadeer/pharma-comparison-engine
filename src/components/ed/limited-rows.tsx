"use client";

import { Children, useState, type ReactNode } from "react";

import { Button } from "@/components/common/button";
import { TableCell, TableRow } from "@/components/common/table";

// Phone grids show the first `limit` pharmacies, then a "Show all" row. The rows are already
// server-rendered (and ranked) — this only decides how many are on screen.
export function LimitedRows({ limit, colSpan, children }: { limit: number; colSpan: number; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const rows = Children.toArray(children);
  if (expanded || rows.length <= limit) return <>{rows}</>;
  return (
    <>
      {rows.slice(0, limit)}
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={colSpan} className="p-3 text-center">
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setExpanded(true)}>
            Show all {rows.length} pharmacies
          </Button>
        </TableCell>
      </TableRow>
    </>
  );
}
