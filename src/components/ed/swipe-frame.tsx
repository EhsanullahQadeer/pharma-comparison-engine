"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

// Phone layout B: a hint above the table and one dot per screenful of columns, following the
// table's own sideways scroll (columns snap into place via CSS on the table container).
export function SwipeFrame({ hint, pages, children }: { hint: string; pages: number; children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const scroller = frame.current?.querySelector<HTMLElement>('[data-slot="table-container"]');
    if (!scroller || pages < 2) return;
    const onScroll = () => {
      const max = scroller.scrollWidth - scroller.clientWidth;
      setPage(max > 0 ? Math.round((scroller.scrollLeft / max) * (pages - 1)) : 0);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [pages]);

  return (
    <div ref={frame}>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>{hint}</p>
        {pages > 1 ? (
          <span aria-hidden="true" className="flex gap-1.5">
            {Array.from({ length: pages }, (_, index) => <span key={index} className={cn("size-2 rounded-full", index === page ? "bg-foreground" : "bg-border")} />)}
          </span>
        ) : null}
      </div>
      <div className="[&_[data-slot=table-container]]:snap-x [&_[data-slot=table-container]]:snap-mandatory [&_[data-slot=table-container]]:scroll-pl-32">{children}</div>
    </div>
  );
}
