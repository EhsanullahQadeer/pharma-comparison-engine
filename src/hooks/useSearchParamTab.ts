"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface UseSearchParamTabOptions {
  /** Other search params to drop when the tab changes (e.g. a nested tab's own param). */
  clearKeys?: readonly string[];
}

/**
 * URL-driven tab state: the selected tab is read from a search param (falling
 * back to the first tab for a missing/unknown value) and written back with
 * `history.pushState`, which Next syncs into `useSearchParams`. That keeps the
 * tab linkable and on the back/forward stack without re-running the page's
 * server fetches on every tab click. The default tab is omitted from the URL.
 */
export function useSearchParamTab<T extends string>(
  paramKey: string,
  tabs: readonly [T, ...T[]],
  options?: UseSearchParamTabOptions,
): [T, (next: T) => void] {
  const searchParams = useSearchParams();
  const raw = searchParams.get(paramKey);
  const defaultTab = tabs[0];
  const tab = tabs.find((candidate) => candidate === raw) ?? defaultTab;
  const clearKeys = options?.clearKeys;

  const setTab = useCallback(
    (next: T) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === defaultTab) {
        params.delete(paramKey);
      } else {
        params.set(paramKey, next);
      }
      clearKeys?.forEach((key) => params.delete(key));
      const query = params.toString();
      window.history.pushState(null, "", query ? `?${query}` : window.location.pathname);
    },
    [searchParams, paramKey, defaultTab, clearKeys],
  );

  return [tab, setTab];
}
