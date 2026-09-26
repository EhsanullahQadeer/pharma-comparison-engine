"use client";

import { useCallback, useReducer } from "react";

export type BulkRunResult = { message?: string; error?: string };

type BulkState = { busy: boolean; progress: string | null; message: string | null; error: string | null };
type BulkEvent =
  | { type: "start"; progress?: string }
  | { type: "progress"; progress: string }
  | { type: "finish"; message?: string; error?: string };

const idle: BulkState = { busy: false, progress: null, message: null, error: null };

const transitions: { [K in BulkEvent["type"]]: (state: BulkState, event: Extract<BulkEvent, { type: K }>) => BulkState } = {
  start: (_state, event) => ({ ...idle, busy: true, progress: event.progress ?? null }),
  progress: (state, event) => ({ ...state, progress: event.progress }),
  finish: (_state, event) => ({ ...idle, message: event.message ?? null, error: event.error ?? null }),
};

function bulkReducer(state: BulkState, event: BulkEvent): BulkState {
  return (transitions[event.type] as (state: BulkState, event: BulkEvent) => BulkState)(state, event);
}

// Busy/progress/result state for a bulk-action toolbar. `run` clears the row selection when the
// work succeeds, so the result message stays while the selection empties.
export function useBulkRun(onClear: () => void) {
  const [state, dispatch] = useReducer(bulkReducer, idle);

  const run = useCallback(async (work: () => Promise<BulkRunResult>, progress?: string) => {
    dispatch({ type: "start", progress });
    const result = await work();
    dispatch({ type: "finish", ...result });
    if (!result.error) onClear();
  }, [onClear]);
  const setProgress = useCallback((progress: string) => dispatch({ type: "progress", progress }), []);
  const dismiss = useCallback(() => dispatch({ type: "finish" }), []);

  return { state, run, setProgress, dismiss };
}
