"use client";

import Pagination from "@/components/common/pagination";
import type { useTableView } from "@/hooks/useTableView";
import { cn } from "@/lib/utils";

/** The page controls and "Rows per page" picker under a table driven by `useTableView`. */
export function TableViewPagination({ pagination, className }: { pagination: ReturnType<typeof useTableView>["pagination"]; className?: string }) {
  return (
    <div className={cn("pt-3", className)}>
      <Pagination {...pagination} />
    </div>
  );
}
