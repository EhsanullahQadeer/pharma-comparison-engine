"use client";

import {
  createContext,
  useContext,
  useTransition,
  type ReactNode,
  type TransitionStartFunction,
} from "react";

export interface TransitionContextValue {
  /** True while a router.push/replace made through useRouter() is in flight. */
  isPending: boolean;
  startTransition: TransitionStartFunction;
}

const noopStart: TransitionStartFunction = (callback) => callback();

const TransitionContext = createContext<TransitionContextValue>({
  isPending: false,
  startTransition: noopStart,
});

export function TransitionProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition();

  return (
    <TransitionContext.Provider value={{ isPending, startTransition }}>
      {children}
    </TransitionContext.Provider>
  );
}

/**
 * Exposes whether a navigation started through `useRouter()` (filters,
 * pagination, sort, any router.push/replace) is still resolving. Pages can
 * use `isPending` to swap their content for a skeleton instead of showing
 * stale data or a blank flash while the server re-renders with new params.
 */
export function usePageTransition() {
  return useContext(TransitionContext);
}
