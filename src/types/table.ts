// A value a table column can be sorted by. Empty values (null, undefined, "") always sort last.
export type SortValue = string | number | boolean | Date | null | undefined;

export type SortOrder = "asc" | "desc";

// One reader per sortable column, keyed by the column's sort key. Define it at module level (or
// memoize it) so the sorted rows aren't recomputed on every render.
export type TableSorters<T, K extends string = string> = Record<K, (row: T) => SortValue>;

// A sort requested through the URL (`?sort=…&order=…`), before the key is checked against the
// columns a list can actually sort by.
export type RequestedSort = { sortBy: string; sortOrder: SortOrder };
