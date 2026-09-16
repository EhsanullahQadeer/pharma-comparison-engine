"use client";

import { useState, useTransition } from "react";

import { runDiscoverySourceNow, type RunDiscoverySourceNowState } from "@/actions/discovery/discovery-sources";
import { Button } from "@/components/common/button";
import type { DiscoverySourceType } from "@/generated/prisma/client";

export function DiscoverySourceRunButton({
  sourceId,
  sourceType,
  onResult,
}: {
  sourceId: string;
  sourceType: DiscoverySourceType;
  onResult?: (result: NonNullable<RunDiscoverySourceNowState["result"]>, sourceType: DiscoverySourceType) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleRun() {
    setError(undefined);
    startTransition(async () => {
      const state = await runDiscoverySourceNow(sourceId);
      if (state.error) {
        setError(state.error);
        return;
      }
      if (state.result) onResult?.(state.result, sourceType);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={handleRun}>
        {isPending ? "Running…" : "Run now"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
