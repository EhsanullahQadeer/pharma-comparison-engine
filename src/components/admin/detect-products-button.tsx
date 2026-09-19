"use client";

import { useState, useTransition } from "react";

import { runProductDetectionForProvider } from "@/actions/product-matches/product-matches";
import { Button } from "@/components/common/button";
import Link from "@/components/Link";

export function DetectProductsButton({ providerId }: { providerId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ candidatesSeen: number; newMatches: number }>();

  function handleRun() {
    setError(undefined);
    setResult(undefined);
    startTransition(async () => {
      const state = await runProductDetectionForProvider(providerId);
      if (state.error) {
        setError(state.error);
        return;
      }
      if (state.result) setResult(state.result);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={handleRun}>
        {isPending ? "Detecting…" : "Detect products"}
      </Button>
      {error ? <p className="max-w-xs text-right text-xs text-destructive">{error}</p> : null}
      {result ? (
        <p className="text-right text-xs text-muted-foreground">
          {result.newMatches} new of {result.candidatesSeen} page{result.candidatesSeen === 1 ? "" : "s"} matched.{" "}
          {result.newMatches > 0 ? <Link href="/admin/reviews" className="text-primary hover:underline">Review →</Link> : null}
        </p>
      ) : null}
    </div>
  );
}
