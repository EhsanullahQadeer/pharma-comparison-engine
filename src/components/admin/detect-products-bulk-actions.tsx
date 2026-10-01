"use client";

import { ScanSearch, Square } from "lucide-react";
import { useRef } from "react";

import { runProductDetectionForProvider } from "@/actions/product-matches/product-matches";
import { BulkActionBar, plural } from "@/components/admin/bulk-action-bar";
import { Button } from "@/components/common/button";
import { useBulkRun } from "@/hooks/useBulkRun";
import { useRouter } from "@/hooks/useRouter";
import { cn } from "@/lib/utils";

// Toolbar above a list of pharmacies while rows are selected: runs the same "Detect products"
// check as a pharmacy's own page, one pharmacy at a time so each site is read politely and staff
// can stop between pharmacies. `providerIds` must already be de-duplicated.
export function DetectProductsBulkActions({ providerIds, onClear }: { providerIds: string[]; onClear: () => void }) {
  const router = useRouter();
  const bulk = useBulkRun(onClear);
  const { state, run, setProgress } = bulk;
  const stopRequested = useRef(false);

  function handleDetect() {
    stopRequested.current = false;
    void run(async () => {
      const ids = [...providerIds];
      let checked = 0;
      let newMatches = 0;
      const failures: string[] = [];
      for (const [index, providerId] of ids.entries()) {
        if (stopRequested.current) break;
        setProgress(`Checking pharmacy ${index + 1} of ${ids.length}… If a Chrome window opens with a security check, complete it there.`);
        const result = await runProductDetectionForProvider(providerId);
        if (result.error) {
          failures.push(result.error);
        } else {
          checked += 1;
          newMatches += result.result?.newMatches ?? 0;
        }
      }
      router.refresh();
      const stopped = stopRequested.current ? " Stopped early." : "";
      const summary = `Checked ${plural(checked, "pharmacy", "pharmacies")}, ${plural(newMatches, "new product")} found`;
      if (failures.length === 0) return { message: `${summary}.${stopped}` };
      return { error: `${summary}, ${failures.length} failed (first error: ${failures[0]}).${stopped}` };
    }, `Checking pharmacy 1 of ${providerIds.length}…`);
  }

  return (
    <BulkActionBar count={providerIds.length} bulk={bulk} onClear={onClear} emptyHint="Select pharmacies to detect their products in bulk.">
      <Button type="button" size="sm" variant="outline" disabled={state.busy || providerIds.length === 0} onClick={handleDetect}>
        <ScanSearch aria-hidden="true" className={cn("size-4", state.busy && "animate-pulse")} />
        Detect products
      </Button>
      {state.busy ? (
        <Button type="button" size="sm" variant="ghost" onClick={() => { stopRequested.current = true; }}>
          <Square aria-hidden="true" className="size-3.5" />
          Stop
        </Button>
      ) : null}
    </BulkActionBar>
  );
}
