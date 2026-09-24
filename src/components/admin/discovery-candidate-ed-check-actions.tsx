"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/common/button";
import { cn } from "@/lib/utils";

type CheckResult = { kind: "PROMOTED" | "NEEDS_GPHC" | "REJECTED_NO_ED_MATCH" | "BLOCKED" };

const resultLabels: Record<CheckResult["kind"], string> = {
  PROMOTED: "ED medicine confirmed — promoted to a new pharmacy provider.",
  NEEDS_GPHC: "ED match found — add a GPhC number above, then Promote.",
  REJECTED_NO_ED_MATCH: "No ED medicine evidence found — rejected.",
  BLOCKED: "Could not check this site — see the message above.",
};

// Drives the live progress panel via the SSE endpoint at
// app/api/discovery-candidates/[id]/ed-check-stream instead of calling checkCandidateForEdMedicine
// directly — a server action can only return once, so it can't narrate what it's doing while a
// human-assisted check (which can run for minutes waiting on CAPTCHA clearance) is still going.
// Same pattern as ProductVariantPriceActions/scrape-stream.
export function DiscoveryCandidateEdCheckActions({ id }: { id: string }) {
  const [isPending, setIsPending] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<CheckResult>();
  const [error, setError] = useState<string>();
  const eventSourceRef = useRef<EventSource | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [log]);

  useEffect(() => {
    return () => eventSourceRef.current?.close();
  }, []);

  function handleCheck(assisted: boolean) {
    eventSourceRef.current?.close();
    setIsPending(true);
    setLog([]);
    setResult(undefined);
    setError(undefined);

    const source = new EventSource(`/api/discovery-candidates/${id}/ed-check-stream?assisted=${assisted}`);
    eventSourceRef.current = source;

    source.addEventListener("progress", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { message: string };
      setLog((prev) => [...prev, data.message]);
    });
    source.addEventListener("done", (event) => {
      setResult(JSON.parse((event as MessageEvent).data) as CheckResult);
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
      setError((prev) => prev ?? "Lost connection to the server while checking.");
      setIsPending(false);
      source.close();
    };
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-1">
        <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => handleCheck(false)}>
          Check for ED medicine
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => handleCheck(true)}>
          Human check
        </Button>
      </div>
      {isPending ? <p className="max-w-56 text-right text-xs text-muted-foreground whitespace-normal!">A CAPTCHA-gated site opens a visible Chrome window on the server computer — complete any verification there.</p> : null}
      {isPending && log.length > 0 ? (
        <div role="status" aria-live="polite" className="max-h-24 w-64 space-y-0.5 overflow-y-auto rounded-md border border-border bg-muted/30 p-1.5 text-left text-xs text-muted-foreground">
          {log.map((line, index) => (
            <p key={index} className={cn("truncate", index === log.length - 1 && "text-foreground")}>{line}</p>
          ))}
          <div ref={logEndRef} />
        </div>
      ) : null}
      {!isPending && result ? <span className="max-w-56 text-right text-xs text-muted-foreground whitespace-normal!">{resultLabels[result.kind]}</span> : null}
      {!isPending && error ? <span className="max-w-48 text-right text-xs text-destructive whitespace-normal!">{error}</span> : null}
    </div>
  );
}
