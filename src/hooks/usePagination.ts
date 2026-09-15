"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { useRouter } from "@/hooks/useRouter";
import { DEFAULT_PAGE_SIZE, parsePageSize } from "@/lib/pagination";

interface UsePaginationOptions {
  /** URL search param name to read/write. Defaults to "page". */
  paramKey?: string;
  /** URL search param name for the page size. Defaults to "pageSize". */
  pageSizeParamKey?: string;
}

interface UsePaginationReturn {
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
}

/**
 * URL-driven page state, matching how `useFilters` drives filters — reads
 * the current page from search params (default 1) and writes changes back
 * via `router.push`, preserving every other param. Page 1 is the implicit
 * default so it's omitted from the URL rather than written as `?page=1`,
 * consistent with `useFilters`'s `setValue` treatment of default values.
 * `pageSize` follows the same convention, defaulting to `DEFAULT_PAGE_SIZE`;
 * changing it resets `page` back to 1 since the old page number no longer
 * lines up with the new page size.
 */
export function usePagination(options?: UsePaginationOptions): UsePaginationReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramKey = options?.paramKey ?? "page";
  const pageSizeParamKey = options?.pageSizeParamKey ?? "pageSize";

  const page = useMemo(() => {
    const raw = Number(searchParams.get(paramKey));
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  }, [searchParams, paramKey]);

  const pageSize = useMemo(
    () => parsePageSize(searchParams.get(pageSizeParamKey) ?? undefined),
    [searchParams, pageSizeParamKey],
  );

  const setPage = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next > 1) {
        params.set(paramKey, String(next));
      } else {
        params.delete(paramKey);
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, paramKey],
  );

  const setPageSize = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next !== DEFAULT_PAGE_SIZE) {
        params.set(pageSizeParamKey, String(next));
      } else {
        params.delete(pageSizeParamKey);
      }
      params.delete(paramKey);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, paramKey, pageSizeParamKey],
  );

  return { page, setPage, pageSize, setPageSize };
}
