"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

import { TableCell, TableRow } from "@/components/common/table";
import { cn } from "@/lib/utils";

// Phone layout A: a pharmacy row whose name opens a detail row underneath (every price with its
// own View link, registration and offer). The content is server-rendered; only open/closed lives here.
export function ExpandableGridRow({ id, name, meta, cells, detail, colSpan, defaultOpen = false }: {
  id: string;
  name: string;
  meta: ReactNode;
  cells: ReactNode;
  detail: ReactNode;
  colSpan: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <TableRow className="hover:bg-transparent">
        <th scope="row" className="sticky left-0 z-[5] border-r border-border bg-card p-2 text-left align-top font-normal">
          {/* A table cell grows to fit its content; this fixed box is what makes long names wrap. */}
          <div className="w-28 whitespace-normal">
          <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)} className="flex min-h-6 w-full items-start gap-1 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">
            <span className="min-w-0 wrap-break-word">{name}</span>
            <ChevronDown aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0 transition-transform", open && "rotate-180")} />
            <span className="sr-only">{open ? ", hide details" : ", show prices and details"}</span>
          </button>
          {meta}
          </div>
        </th>
        {cells}
      </TableRow>
      <TableRow id={id} hidden={!open} className="bg-muted/30 hover:bg-muted/30">
        <TableCell colSpan={colSpan} className="p-3 whitespace-normal">{detail}</TableCell>
      </TableRow>
    </>
  );
}
