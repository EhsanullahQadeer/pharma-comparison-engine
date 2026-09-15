"use client";

import {
  tableColumnsRegistry,
  type TableKey,
  type ResolvedColumn,
} from "@/hooks/table-columns-registry";

export function useTableColumns(
  tableKey: TableKey,
  t: (key: string) => string
): ResolvedColumn[] {
  const columns = tableColumnsRegistry[tableKey];
  return columns.map((col) => ({
    ...col,
    label: col.labelKey === "#" ? "#" : t(col.labelKey),
  }));
}
