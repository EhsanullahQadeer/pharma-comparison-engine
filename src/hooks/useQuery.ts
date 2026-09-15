"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { subscribeToQuery } from "@/hooks/query-events";
import {
  queryRegistry,
  type QueryArgs,
  type QueryData,
  type QueryKey,
} from "@/hooks/query-registry";

export interface UseQueryOptions<T> {
  /** Skip fetching until this becomes true (e.g. a dependent value isn't ready yet). Defaults to true. */
  enabled?: boolean;
  /**
   * Server-fetched result used for the initial render. When provided, the
   * hook renders it immediately (isLoading stays false), treats it as
   * already-fetched data and skips the duplicate client fetch on mount —
   * it only refetches when `key`/`args` change or the query is invalidated.
   * Unlike the un-seeded path, data is NOT cleared while refetching (kept
   * visible, surfaced as `isRefetching`), matching how the app's server-seeded
   * tables/lists behave.
   */
  initialData?: T;
}

export interface UseQueryResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isRefetching: boolean;
  refetch: () => Promise<void>;
}

/**
 * Calls the server action registered under `key` in `queryRegistry` and
 * exposes tanstack-query-style state: `data`, `error`, `isLoading` (first
 * fetch for this key/args), `isRefetching` (any fetch after that), and
 * `refetch`. Re-fetches whenever `key` or `args` change.
 *
 * This is a lightweight in-component fetcher, not a cache — two components
 * using the same key each fetch independently. It does, however, listen for
 * invalidation: a `useMutate(...).mutate()` call whose `invalidateKeys`
 * includes this `key` triggers an automatic refetch (as `isRefetching`,
 * keeping the current `data` visible while it reloads).
 *
 * @example
 * const { data, isLoading, error } = useQuery("categories");
 * const { data } = useQuery("subcategories", [categoryId]);
 * const { data } = useQuery("customers", [{ page: 1, search }]);
 */
export function useQuery<K extends QueryKey>(
  key: K,
  args?: QueryArgs<K>,
  options?: UseQueryOptions<QueryData<K>>,
): UseQueryResult<QueryData<K>> {
  const { enabled = true, initialData } = options ?? {};
  const argsKey = JSON.stringify(args ?? []);
  const seeded = initialData !== undefined;

  const [data, setData] = useState<QueryData<K> | undefined>(initialData);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(enabled && !seeded);
  const [isRefetching, setIsRefetching] = useState(false);

  const argsRef = useRef(args);
  useEffect(() => {
    argsRef.current = args;
  });
  const requestIdRef = useRef(0);
  const hasDataRef = useRef(seeded);
  // With server-seeded `initialData`, skip the duplicate request that mount
  // would otherwise trigger — data is already present for the initial args.
  const skipFirstRunRef = useRef(seeded);

  const run = useCallback(async (clearData = false) => {
    if (!enabled) {
      return;
    }

    const requestId = ++requestIdRef.current;
    if (clearData) {
      hasDataRef.current = false;
      setData(undefined);
    }
    if (hasDataRef.current) {
      setIsRefetching(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const action = queryRegistry[key] as (
        ...actionArgs: QueryArgs<K>
      ) => Promise<QueryData<K>>;
      const result = await action(...((argsRef.current ?? []) as QueryArgs<K>));

      if (requestId !== requestIdRef.current) {
        return;
      }
      hasDataRef.current = true;
      setData(result);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setIsRefetching(false);
      }
    }
  }, [key, enabled]);

  useEffect(() => {
    if (skipFirstRunRef.current) {
      skipFirstRunRef.current = false;
      return;
    }

    // Un-seeded path keeps the original behavior: an args/key change is a
    // brand-new query, so clear data and show the loading state.
    run(!seeded);
    // `argsKey` (stringified args) is the real dependency — it drives
    // refetching whenever the parameters passed to the action change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, argsKey, enabled]);

  useEffect(() => {
    return subscribeToQuery(key, run);
  }, [key, run]);

  const refetch = useCallback(() => run(), [run]);

  return { data, error, isLoading, isRefetching, refetch };
}
