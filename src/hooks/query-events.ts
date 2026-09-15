import type { QueryKey } from "@/hooks/query-registry";

type Unsubscribe = () => void;
type RunFn = () => Promise<void>;

const listeners = new Map<string, Set<RunFn>>();

export function subscribeToQuery(_key: QueryKey, run: RunFn): Unsubscribe {
  const key = String(_key);
  if (!listeners.has(key)) listeners.set(key, new Set());
  const set = listeners.get(key);
  set?.add(run);
  return () => {
    set?.delete(run);
    if (set && set.size === 0) listeners.delete(key);
  };
}

export function invalidateQueries(keys: QueryKey | QueryKey[]): void {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const key of list) {
    const set = listeners.get(String(key));
    if (set) {
      for (const fn of set) fn();
    }
  }
}
