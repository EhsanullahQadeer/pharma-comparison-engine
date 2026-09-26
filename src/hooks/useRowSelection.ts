"use client";

import { useCallback, useMemo, useState } from "react";

// Checkbox selection for a table's rows. `ids` must be memoized by the caller; ids that disappear
// (e.g. deleted rows after a refresh) simply drop out of `selectedIds`.
export function useRowSelection(ids: readonly string[]) {
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());

  const selectedIds = useMemo(() => ids.filter((id) => picked.has(id)), [ids, picked]);
  const allSelected = ids.length > 0 && selectedIds.length === ids.length;

  const isSelected = useCallback((id: string) => picked.has(id), [picked]);
  const toggle = useCallback((id: string, checked: boolean) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);
  const toggleAll = useCallback((checked: boolean) => setPicked(checked ? new Set(ids) : new Set()), [ids]);
  const clear = useCallback(() => setPicked(new Set()), []);

  return { selectedIds, allSelected, someSelected: selectedIds.length > 0 && !allSelected, isSelected, toggle, toggleAll, clear };
}
