"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { mutationRegistry, type MutationKey } from "@/hooks/mutation-registry";
export type { MutationKey };
import { invalidateQueries } from "@/hooks/query-events";
import type { QueryKey } from "@/hooks/query-registry";


type MutationAction<K extends MutationKey> = (typeof mutationRegistry)[K];
export type MutationArgs<K extends MutationKey> = Parameters<MutationAction<K>>;
export type MutationData<K extends MutationKey> = Awaited<ReturnType<MutationAction<K>>>;

type Status = "idle" | "pending" | "success" | "error";

export interface UseMutateOptions<K extends MutationKey> {
  /** Query key(s), from `queryRegistry`, to refetch after this mutation succeeds. */
  invalidateKeys?: QueryKey | QueryKey[];
  onSuccess?: (data: MutationData<K>, args: MutationArgs<K>) => void;
  onError?: (error: Error, args: MutationArgs<K>) => void;
}

export interface UseMutateResult<K extends MutationKey> {
  data: MutationData<K> | undefined;
  error: Error | null;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  isIdle: boolean;
  /** Fire-and-forget: errors surface via `isError`/`error`/`onError`, not a rejected promise. */
  mutate: (...args: MutationArgs<K>) => void;
  /** Same call, but returns/throws so callers can `await` it directly. */
  mutateAsync: (...args: MutationArgs<K>) => Promise<MutationData<K>>;
  reset: () => void;
}

/**
 * Calls the server action registered under `key` in `mutationRegistry` and
 * exposes tanstack-mutation-style state: `isPending`/`isSuccess`/`isError`,
 * `data`, `error`. On success, any `invalidateKeys` are passed to
 * `invalidateQueries`, so every mounted `useQuery` for those keys refetches
 * automatically.
 *
 * @example
 * const { mutate, isPending, error } = useMutate("createCategory", {
 *   invalidateKeys: ["categories", "subcategories"],
 *   onSuccess: () => setOpen(false),
 * });
 * mutate(formData);
 */
export function useMutate<K extends MutationKey>(
  key: K,
  options?: UseMutateOptions<K>,
): UseMutateResult<K> {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<MutationData<K>>();
  const [error, setError] = useState<Error | null>(null);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });
  const requestIdRef = useRef(0);

  const mutateAsync = useCallback(
    async (...args: MutationArgs<K>): Promise<MutationData<K>> => {
      const requestId = ++requestIdRef.current;
      setStatus("pending");
      setError(null);

      try {
        const action = mutationRegistry[key] as unknown as (
          ...actionArgs: MutationArgs<K>
        ) => Promise<MutationData<K>>;
        const result = await action(...args);

        if (requestId === requestIdRef.current) {
          setData(result);
          setStatus("success");
        }

        const { invalidateKeys, onSuccess } = optionsRef.current ?? {};
        if (invalidateKeys) {
          invalidateQueries(invalidateKeys);
        }
        // Any staff action can add or clear pending work, so the header bell re-counts after each.
        invalidateQueries("pendingWork");
        onSuccess?.(result, args);

        return result;
      } catch (err) {
        const normalizedError = err instanceof Error ? err : new Error(String(err));
        if (requestId === requestIdRef.current) {
          setError(normalizedError);
          setStatus("error");
        }
        optionsRef.current?.onError?.(normalizedError, args);
        throw normalizedError;
      }
    },
    [key],
  );

  const mutate = useCallback(
    (...args: MutationArgs<K>) => {
      mutateAsync(...args).catch(() => {});
    },
    [mutateAsync],
  );

  const reset = useCallback(() => {
    requestIdRef.current++;
    setStatus("idle");
    setData(undefined);
    setError(null);
  }, []);

  return {
    data,
    error,
    isPending: status === "pending",
    isSuccess: status === "success",
    isError: status === "error",
    isIdle: status === "idle",
    mutate,
    mutateAsync,
    reset,
  };
}
