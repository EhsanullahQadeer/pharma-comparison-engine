"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/common/button";
import { cn } from "@/lib/utils";

type BacklogCheckResult = { attempted: number; totals: { promoted: number; needsGphc: number; rejected: number; blocked: number } };

// Page-level "Filter for ED medicine"/"Human filter" buttons above the Discovery candidates queue —
// runs the same check as scripts/filter-discovery-candidates-by-ed-medicine.ts across the whole NEW
// backlog, from the browser, streamed via app/api/discovery-candidates/ed-check-stream so this long
// (many-minute, especially in human mode) run can narrate itself instead of leaving the button
// spinning with no feedback. Same EventSource pattern as DiscoveryCandidateEdCheckActions.
export function DiscoveryCandidatesBacklogCheckActions() {
  const [isPending, setIsPending] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<BacklogCheckResult>();
  const [error, setError] = useState<string>();
  const eventSourceRef = useRef<EventSource | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [log]);

  useEffect(() => {
    return () => eventSourceRef.current?.close();
  }, []);

  function handleRun(assisted: boolean) {
    eventSourceRef.current?.close();
    setIsPending(true);
    setLog([]);
    setResult(undefined);
    setError(undefined);

    const source = new EventSource(`/api/discovery-candidates/ed-check-stream?assisted=${assisted}`);
    eventSourceRef.current = source;

    source.addEventListener("progress", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { message: string };
      setLog((prev) => [...prev, data.message]);
    });
    source.addEventListener("done", (event) => {
      setResult(JSON.parse((event as MessageEvent).data) as BacklogCheckResult);
      setIsPending(false);
      source.close();
    });
    source.addEventListener("check-error", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { message: string };
      setError(data.message);
      setIsPending(false);
      source.close();
    });
    source.onerror = () => {
      setError((prev) => prev ?? "Lost connection to the server while filtering.");
      setIsPending(false);
      source.close();
    };
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Filter pending candidates for ED medicine</p>
          <p className="text-xs text-muted-foreground">Checks every pending candidate&apos;s own website for a real ED medicine product page, promoting confirmed matches with a GPhC number and rejecting the rest — same rule as the per-row check.</p>
        </div>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => handleRun(false)}>
            {isPending ? "Filtering…" : "Filter for ED medicine"}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => handleRun(true)}>
            Human filter
          </Button>
        </div>
      </div>
      {isPending ? <p className="text-xs text-muted-foreground">CAPTCHA-gated sites open a visible Chrome window on the server computer during a human filter — complete any verification there.</p> : null}
      {log.length > 0 ? (
        <div role="status" aria-live="polite" className="max-h-56 space-y-0.5 overflow-y-auto rounded-md border border-border bg-background p-2 text-left text-xs text-muted-foreground">
          {log.map((line, index) => (
            <p key={index} className={cn("truncate", index === log.length - 1 && "text-foreground")}>{line}</p>
          ))}
          <div ref={logEndRef} />
        </div>
      ) : null}
      {!isPending && result ? (
        <p className="text-xs text-muted-foreground">
          {result.attempted} checked — {result.totals.promoted} promoted, {result.totals.needsGphc} need a GPhC number, {result.totals.rejected} rejected, {result.totals.blocked} could not be checked.
        </p>
      ) : null}
      {!isPending && error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
