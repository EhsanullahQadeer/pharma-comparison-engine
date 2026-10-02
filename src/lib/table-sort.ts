import type { RequestedSort, SortOrder, SortValue } from "@/types/table";

type PresentSortValue = Exclude<SortValue, null | undefined>;

function isEmpty(value: SortValue): value is null | undefined | "" {
  return value === null || value === undefined || value === "";
}

// Text compares case-insensitively with embedded numbers in numeric order ("50mg" before "100mg").
export function compareSortValues(a: PresentSortValue, b: PresentSortValue): number {
  if (typeof a === "string" || typeof b === "string") return String(a).localeCompare(String(b), "en-GB", { numeric: true, sensitivity: "base" });
  return Number(a) - Number(b);
}

// Stable sort of a copy; rows with no value for the column stay at the bottom in either direction.
export function sortRows<T>(rows: readonly T[], read: (row: T) => SortValue, order: SortOrder): T[] {
  const direction = order === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: read(row) }))
    .sort((left, right) => {
      if (isEmpty(left.value) || isEmpty(right.value)) return Number(isEmpty(left.value)) - Number(isEmpty(right.value)) || left.index - right.index;
      return direction * compareSortValues(left.value, right.value) || left.index - right.index;
    })
    .map((entry) => entry.row);
}

// Clicking a column header cycles ascending → descending → unsorted.
export function nextSort(current: RequestedSort | null, key: string): RequestedSort | null {
  if (current?.sortBy !== key) return { sortBy: key, sortOrder: "asc" };
  return current.sortOrder === "asc" ? { sortBy: key, sortOrder: "desc" } : null;
}

/** Reads `sort`/`order` search-param values in a server component; the action checks the key. */
export function parseSort(sort: unknown, order: unknown): RequestedSort | undefined {
  return typeof sort === "string" && sort ? { sortBy: sort, sortOrder: order === "desc" ? "desc" : "asc" } : undefined;
}
