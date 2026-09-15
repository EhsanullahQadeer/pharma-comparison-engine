export interface ColumnDef {
  key: string;
  labelKey: string;
  sortKey?: string;
  align?: "left" | "right" | "center";
  resizable?: boolean;
  className?: string;
}

export type TableKey = string & {};

export const tableColumnsRegistry: Record<TableKey, ColumnDef[]> = {};

export type ResolvedColumn = ColumnDef & { label: string };
