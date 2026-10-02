"use client";

import { useCallback, useMemo, useReducer } from "react";

import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { nextSort, sortRows } from "@/lib/table-sort";
import type { RequestedSort, TableSorters } from "@/types/table";

type State = { sort: RequestedSort | null; page: number; pageSize: number };
type Action = { type: "sort"; key: string } | { type: "page"; page: number } | { type: "pageSize"; pageSize: number };

// Changing the sort or the page size goes back to the first page: the old page number no longer
// points at the same rows.
const transitions: { [K in Action["type"]]: (state: State, action: Extract<Action, { type: K }>) => State } = {
  sort: (state, action) => ({ ...state, sort: nextSort(state.sort, action.key), page: 1 }),
  page: (state, action) => ({ ...state, page: action.page }),
  pageSize: (state, action) => ({ ...state, pageSize: action.pageSize, page: 1 }),
};

function reducer(state: State, action: Action): State {
  return (transitions[action.type] as (state: State, action: Action) => State)(state, action);
}

const initialState: State = { sort: null, page: 1, pageSize: DEFAULT_PAGE_SIZE };

/**
 * In-memory column sorting and pagination for a table whose rows are already all on the client.
 * `rows` and `sorters` must be stable (memoized / module-level). Render `view.rows`, spread
 * `view.sortProps("key")` onto each sortable `TableHead`, and pass `view.pagination` to
 * `TableViewPagination`. Lists paged by the database use `PaginationServer` + `UrlSortTableHead`
 * instead.
 */
export function useTableView<T, K extends string>(rows: readonly T[], sorters: TableSorters<T, K>) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { sort, pageSize } = state;

  const sorted = useMemo(() => {
    const read = sort ? sorters[sort.sortBy as K] : undefined;
    return sort && read ? sortRows(rows, read, sort.sortOrder) : rows;
  }, [rows, sorters, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  // Rows can disappear (deleted, rejected) while a later page is open.
  const page = Math.min(state.page, pages);
  const pageRows = useMemo(() => sorted.slice((page - 1) * pageSize, page * pageSize), [sorted, page, pageSize]);

  const sortProps = useCallback(
    (key: K) => ({
      sortable: true,
      sortDirection: sort?.sortBy === key ? sort.sortOrder : (false as const),
      onSort: () => dispatch({ type: "sort", key }),
    }),
    [sort],
  );
  const setPage = useCallback((next: number) => dispatch({ type: "page", page: next }), []);
  const onPageSizeChange = useCallback((next: number) => dispatch({ type: "pageSize", pageSize: next }), []);
  const pagination = useMemo(
    () => ({ page, setPage, pages, total: sorted.length, pageSize, onPageSizeChange }),
    [page, setPage, pages, sorted.length, pageSize, onPageSizeChange],
  );

  return { rows: pageRows, sortProps, pagination };
}
