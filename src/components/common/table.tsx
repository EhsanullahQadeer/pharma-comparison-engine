"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import * as React from "react";

import { Skeleton } from "@/components/common/skeleton";
import {
  Table as TableRoot,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { usePageTransition } from "@/contexts/transition-context";
import type { ResolvedColumn } from "@/hooks/table-columns-registry";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | false;

const TableResizableContext = React.createContext(false);
const StickyHeaderContext = React.createContext(false);

interface TableProps extends React.ComponentProps<typeof TableRoot> {
  /** Enables column-width resizing for every `TableHead` inside (override per column via its own `resizable` prop). Defaults to on. */
  resizable?: boolean;
  /** Makes the header row sticky when the table's scrollable parent has a constrained height. */
  stickyHeader?: boolean;
  /** Max height of the table container. Enables vertical scroll + sticky header. */
  maxHeight?: string;
  /** Column definitions from `useTableColumns`. When provided, the header row is rendered automatically — omit the manual `<TableHeader>` block. */
  columns?: ResolvedColumn[];
  /** Current sort column key (from `useServerTable`). Required when `columns` has sortable entries. */
  sortBy?: string;
  /** Current sort direction (from `useServerTable`). */
  sortOrder?: SortDirection;
  /** Sort toggle callback (from `useServerTable`). Called with the column's `sortKey` on click. */
  onSort?: (column: string) => void;
  /** Extra classes for the auto-rendered header `<tr>`. */
  headerClassName?: string;
  /** Shows skeleton placeholder rows instead of `children`. Requires `columns` to know how many columns to render. */
  loading?: boolean;
  /** Text shown in a full-width empty-state row when `children` is falsy and not loading. Requires `columns`. */
  emptyMessage?: string;
  /** Number of skeleton rows to render when `loading` is true. Defaults to 5. */
  skeletonRows?: number;
  /** Per-column className factory for skeleton cells. Receives the column index. */
  skeletonCellClassName?: (columnIndex: number) => string;
}

function Table({
  style,
  resizable = true,
  stickyHeader = true,
  maxHeight,
  className,
  columns,
  sortBy,
  sortOrder,
  onSort,
  headerClassName,
  loading = false,
  emptyMessage,
  skeletonRows,
  skeletonCellClassName,
  children,
  ...props
}: TableProps) {
  const colCount = columns?.length;
  const isEmpty =
    !children || (Array.isArray(children) && children.length === 0);
  const { isPending } = usePageTransition();

  const table = (
    <TableResizableContext.Provider value={resizable}>
      <StickyHeaderContext.Provider value={stickyHeader}>
        <TableRoot
          className={cn("", className)}
          style={resizable ? { tableLayout: "fixed", ...style } : style}
          {...props}
        >
          {columns ? (
            <>
              <TableHeader>
                <TableRow className={headerClassName}>
                  {columns.map((col) => {
                    const sortKeyValue = col.sortKey;
                    return (
                      <TableHead
                        key={col.key}
                        sortable={!!sortKeyValue}
                        sortDirection={
                          sortKeyValue
                            ? sortBy === sortKeyValue && sortOrder
                            : undefined
                        }
                        onSort={
                          sortKeyValue && onSort
                            ? () => onSort(sortKeyValue)
                            : undefined
                        }
                        className={cn(
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center",
                          col.className,
                        )}
                        resizable={col.resizable}
                      >
                        {col.label}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  if ((loading || isPending) && colCount) {
                    return (
                      <TableSkeletonRows
                        rows={skeletonRows}
                        columns={colCount}
                        cellClassName={skeletonCellClassName}
                      />
                    );
                  }
                  if (isEmpty && colCount && emptyMessage) {
                    return (
                      <TableRow>
                        <TableCell
                          colSpan={colCount}
                          className="text-center py-8"
                        >
                          {emptyMessage}
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return children;
                })()}
              </TableBody>
            </>
          ) : (
            children
          )}
        </TableRoot>
      </StickyHeaderContext.Provider>
    </TableResizableContext.Provider>
  );

  if (maxHeight) {
    return (
      <div
        className="relative w-full overflow-y-auto"
        style={{ maxHeight }}
      >
        {table}
      </div>
    );
  }

  return table;
}

interface TableHeadProps extends React.ComponentProps<"th"> {
  /** Renders the header as a clickable control with a sort indicator. */
  sortable?: boolean;
  /** Current sort state for this column: "asc" | "desc" | false (not sorted). */
  sortDirection?: SortDirection;
  onSort?: () => void;
  /** Defaults to the parent `Table`'s `resizable` setting; set to override per column. */
  resizable?: boolean;
  /** Floor for manual resizing. Also applied as the column's initial CSS min-width (unset by default) — pass this to force a sensible width on a dense, many-column table instead of letting `table-layout: fixed` squeeze every column equally. */
  minWidth?: number;
  maxWidth?: number;
}

function TableHead({
  className,
  style,
  children,
  sortable = false,
  sortDirection = false,
  onSort,
  resizable,
  minWidth,
  maxWidth,
  ...props
}: TableHeadProps) {
  const tableResizable = React.useContext(TableResizableContext);
  const stickyHeader = React.useContext(StickyHeaderContext);
  const isResizable = resizable ?? tableResizable;

  const thRef = React.useRef<HTMLTableCellElement>(null);
  const [width, setWidth] = React.useState<number>();
  const dragRef = React.useRef<{
    startX: number;
    startWidth: number;
    dir: 1 | -1;
  } | null>(null);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const th = thRef.current;
    if (!th) return;
    event.preventDefault();
    event.stopPropagation();
    const rtl = getComputedStyle(th).direction === "rtl";
    dragRef.current = {
      startX: event.clientX,
      startWidth: th.getBoundingClientRect().width,
      dir: rtl ? -1 : 1,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    let next = drag.startWidth + (event.clientX - drag.startX) * drag.dir;
    next = Math.max(minWidth ?? 60, next);
    if (maxWidth != null) next = Math.min(maxWidth, next);
    setWidth(next);
  };

  const stopDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  let SortIcon = ChevronsUpDown;
  if (sortDirection === "asc") {
    SortIcon = ArrowUp;
  } else if (sortDirection === "desc") {
    SortIcon = ArrowDown;
  }

  let thStyle = style;
  if (width != null) thStyle = { ...style, width, minWidth: width, maxWidth: width };
  else if (minWidth != null) thStyle = { ...style, minWidth };

  return (
    <th
      ref={thRef}
      data-slot="table-head"
      className={cn(
        "text-muted-foreground h-11 px-4 text-start align-middle text-sm font-medium relative has-[[role=checkbox]]:pr-0 [[role=checkbox]]:translate-y-0.5",
        stickyHeader && "sticky top-0 z-10 bg-muted",
        isResizable && "overflow-hidden whitespace-nowrap",
        className,
      )}
      style={thStyle}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className="inline-flex max-w-full items-center gap-1 select-none hover:text-foreground/80"
        >
          <span className="truncate">{children}</span>
          <SortIcon className="h-3 w-3 shrink-0 opacity-70" />
        </button>
      ) : (
        children
      )}
      {isResizable ? (
        <div
          role="separator"
          aria-orientation="vertical"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          className="absolute inset-y-0 inset-e-0 w-1.5 cursor-col-resize touch-none select-none hover:bg-primary/40 active:bg-primary/50"
        />
      ) : null}
    </th>
  );
}

function TableSkeletonRows({
  rows = 5,
  columns,
  cellClassName,
}: {
  rows?: number;
  columns: number;
  cellClassName?: (columnIndex: number) => string;
}) {
  const lastColumnIndex = columns - 1;

  function defaultCellClassName(columnIndex: number) {
    if (columnIndex === lastColumnIndex) return "h-8 w-24 ml-auto";
    return "h-4 w-24";
  }

  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <TableRow key={row}>
          {Array.from({ length: columns }).map((_, col) => (
            <TableCell
              key={col}
              className={col === lastColumnIndex ? "text-right" : undefined}
            >
              <Skeleton
                className={
                  cellClassName ? cellClassName(col) : defaultCellClassName(col)
                }
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
