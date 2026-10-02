"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { TableHead } from "@/components/common/table";
import { useRouter } from "@/hooks/useRouter";
import { nextSort, parseSort } from "@/lib/table-sort";

import type { ComponentProps } from "react";

type UrlSortTableHeadProps = Omit<ComponentProps<typeof TableHead>, "sortable" | "sortDirection" | "onSort"> & {
  /** Value written to the `sort` search param; the page's server action maps it to a database order. */
  sortKey: string;
};

/**
 * Sortable column header for a list the database pages (see `PaginationServer`): the sort lives in
 * the URL (`?sort=…&order=…`) so the server component can pass it to its query. Changing it goes
 * back to the first page.
 */
export function UrlSortTableHead({ sortKey, ...props }: UrlSortTableHeadProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = parseSort(searchParams.get("sort"), searchParams.get("order")) ?? null;

  const handleSort = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    const next = nextSort(parseSort(params.get("sort"), params.get("order")) ?? null, sortKey);
    params.delete("sort");
    params.delete("order");
    params.delete("page");
    if (next) {
      params.set("sort", next.sortBy);
      if (next.sortOrder === "desc") params.set("order", "desc");
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams, sortKey]);

  return <TableHead sortable sortDirection={current?.sortBy === sortKey ? current.sortOrder : false} onSort={handleSort} {...props} />;
}
