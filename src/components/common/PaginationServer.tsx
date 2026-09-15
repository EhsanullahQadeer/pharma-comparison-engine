"use client";

import Pagination from "@/components/common/pagination";
import { usePagination } from "@/hooks/usePagination";

interface PaginationServerProps {
  pages: number;
  total: number;
  /** URL search param name to read/write. Defaults to "page". */
  paramKey?: string;
  /** URL search param name for the page size. Defaults to "pageSize". */
  pageSizeParamKey?: string;
}

/**
 * URL-driven counterpart to `Pagination` — same UI, but `page`/`pageSize`
 * come from (and write back to) the URL via `usePagination` instead of a
 * parent-managed state variable. `pages`/`total` still come from the server
 * page component, since only it knows the count after querying the DB with
 * that page size — the server component reads the same `pageSize` param
 * (see `parsePageSize` in `@/lib/pagination`) to pass as its query's `limit`.
 */
export default function PaginationServer({ pages, total, paramKey, pageSizeParamKey }: PaginationServerProps) {
  const { page, setPage, pageSize, setPageSize } = usePagination({ paramKey, pageSizeParamKey });

  return (
    <Pagination
      page={page}
      setPage={setPage}
      pages={pages}
      total={total}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
    />
  );
}
