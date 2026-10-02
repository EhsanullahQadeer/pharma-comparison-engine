"use client";

import { Ban, Check, RefreshCw, Square, UserCheck } from "lucide-react";
import { useRef } from "react";

import { confirmAndCollectProductMatch, confirmProductMatch, rejectProductMatch } from "@/actions/product-matches/product-matches";
import { BulkActionBar, plural } from "@/components/admin/bulk-action-bar";
import { Button } from "@/components/common/button";
import { useBulkRun } from "@/hooks/useBulkRun";
import { useRouter } from "@/hooks/useRouter";
import { confirm } from "@/lib/confirm-store";

// A ticked suggestion with the variant currently chosen in its row ("" when none is chosen yet).
export type ProductMatchBulkRow = { matchId: string; productVariantId: string };

type RowWork = { verb: string; done: string; act: (row: ProductMatchBulkRow) => Promise<{ error?: string }> };

const confirmWork = {
  confirm: { verb: "Confirming", done: "Confirmed", act: (row) => confirmProductMatch(row.matchId, row.productVariantId) },
  scrape: { verb: "Confirming and scraping", done: "Confirmed and scraped", act: (row) => confirmAndCollectProductMatch(row.matchId, row.productVariantId, false) },
  humanScrape: { verb: "Confirming and scraping", done: "Confirmed and scraped", act: (row) => confirmAndCollectProductMatch(row.matchId, row.productVariantId, true) },
} satisfies Record<string, RowWork>;

const rejectWork: RowWork = { verb: "Rejecting", done: "Rejected", act: (row) => rejectProductMatch(row.matchId) };

// Toolbar above the suggested product matches. Each action works through the ticked rows one at a
// time (a scrape reads the pharmacy's site, so it is done politely and can be stopped between
// rows). Confirming uses the variant chosen in each row; rows with none chosen are left alone.
export function ProductMatchBulkActions({ rows, onClear }: { rows: ProductMatchBulkRow[]; onClear: () => void }) {
  const router = useRouter();
  const bulk = useBulkRun(onClear);
  const { state, run, setProgress } = bulk;
  const stopRequested = useRef(false);

  const withVariant = rows.filter((row) => row.productVariantId);
  const missingVariant = rows.length - withVariant.length;

  function runEach(targets: ProductMatchBulkRow[], work: RowWork, skippedNote: string) {
    stopRequested.current = false;
    void run(async () => {
      let succeeded = 0;
      const failures: string[] = [];
      for (const [index, row] of targets.entries()) {
        if (stopRequested.current) break;
        setProgress(`${work.verb} ${index + 1} of ${targets.length}…`);
        const result = await work.act(row);
        if (result.error) failures.push(result.error);
        else succeeded += 1;
      }
      router.refresh();
      const stopped = stopRequested.current ? " Stopped early." : "";
      const summary = `${work.done} ${plural(succeeded, "product page")}`;
      if (failures.length === 0) return { message: `${summary}.${skippedNote}${stopped}` };
      return { error: `${summary}, ${failures.length} failed (first error: ${failures[0]}).${skippedNote}${stopped}` };
    }, `${work.verb} 1 of ${targets.length}…`);
  }

  function handleConfirm(kind: keyof typeof confirmWork) {
    const skipped = missingVariant > 0 ? ` ${plural(missingVariant, "row")} skipped — no exact variant chosen.` : "";
    runEach(withVariant, confirmWork[kind], skipped);
  }

  async function handleReject() {
    const ok = await confirm({
      title: `Reject ${plural(rows.length, "suggested page")}?`,
      message: `${rows.length === 1 ? "This page" : "These pages"} will be removed from the suggestions and won't be suggested again.`,
      confirmText: "Reject",
      variant: "destructive",
    });
    if (ok) runEach(rows, rejectWork, "");
  }

  const disabled = state.busy || rows.length === 0;
  const confirmDisabled = disabled || withVariant.length === 0;

  return (
    <BulkActionBar count={rows.length} bulk={bulk} onClear={onClear} emptyHint="Tick suggested pages to confirm, scrape or reject several at once.">
      <Button type="button" size="sm" disabled={confirmDisabled} onClick={() => handleConfirm("scrape")}>
        <RefreshCw aria-hidden="true" className="size-4" />
        Confirm & scrape
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={confirmDisabled} onClick={() => handleConfirm("confirm")}>
        <Check aria-hidden="true" className="size-4" />
        Confirm
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={confirmDisabled} onClick={() => handleConfirm("humanScrape")}>
        <UserCheck aria-hidden="true" className="size-4" />
        Human scrape
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={handleReject} className="text-destructive">
        <Ban aria-hidden="true" className="size-4" />
        Reject
      </Button>
      {state.busy ? (
        <Button type="button" size="sm" variant="ghost" onClick={() => { stopRequested.current = true; }}>
          <Square aria-hidden="true" className="size-3.5" />
          Stop
        </Button>
      ) : null}
      {missingVariant > 0 && !state.busy ? <span className="text-xs text-muted-foreground">{plural(missingVariant, "ticked row")} without a variant will be skipped when confirming.</span> : null}
    </BulkActionBar>
  );
}
