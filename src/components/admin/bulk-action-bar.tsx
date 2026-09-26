"use client";

import { X } from "lucide-react";

import { Button } from "@/components/common/button";
import { Checkbox } from "@/components/common/checkbox";
import type { useBulkRun } from "@/hooks/useBulkRun";

export function plural(count: number, noun: string, pluralNoun = `${noun}s`) {
  return `${count} ${count === 1 ? noun : pluralNoun}`;
}

export function SelectAllCheckbox({ allSelected, someSelected, onToggleAll, label }: { allSelected: boolean; someSelected: boolean; onToggleAll: (checked: boolean) => void; label: string }) {
  return <Checkbox checked={allSelected} indeterminate={someSelected} onCheckedChange={(checked) => onToggleAll(checked === true)} aria-label={label} />;
}

// Shared frame for the toolbars shown above a table while rows are selected: count, the
// feature's action buttons (children), Clear/Dismiss, and the progress/result line. Hidden
// when nothing is selected and there's no result left to show, unless `emptyHint` is given — then
// it stays on top of the table with the hint in place of the count.
export function BulkActionBar({ count, bulk, onClear, emptyHint, children }: { count: number; bulk: ReturnType<typeof useBulkRun>; onClear: () => void; emptyHint?: string; children: React.ReactNode }) {
  const { state, dismiss } = bulk;
  const idle = count === 0 && !state.busy && !state.message && !state.error;
  if (idle && !emptyHint) return null;

  return (
    <div className="flex flex-col gap-2 border-y border-border bg-muted/40 px-4 py-2 sm:flex-row sm:flex-wrap sm:items-center">
      {count > 0 ? <span className="text-sm font-medium">{count} selected</span> : null}
      {idle ? <span className="text-sm text-muted-foreground">{emptyHint}</span> : null}
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {!state.busy && !idle ? (
          <Button type="button" size="sm" variant="ghost" onClick={count > 0 ? onClear : dismiss}>
            <X aria-hidden="true" className="size-4" />
            {count > 0 ? "Clear" : "Dismiss"}
          </Button>
        ) : null}
      </div>
      <p role="status" className="text-xs text-muted-foreground sm:ml-auto">
        {state.progress ?? state.message}
      </p>
      {state.error ? <p role="alert" className="w-full text-xs text-destructive">{state.error}</p> : null}
    </div>
  );
}
