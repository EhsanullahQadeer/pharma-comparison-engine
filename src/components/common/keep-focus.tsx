"use client";

import { useEffect, useRef } from "react";

// Server-rendered links that re-render their own section when followed (the price grid's sort
// links) lose keyboard focus: the new markup replaces the old, focus falls back to the page, and the
// next Tab jumps past the table (WCAG 2.4.3). A link marked data-keep-focus="<key>" gets focus back
// on its replacement. Render <KeepFocus /> inside the element that re-renders (the grid's table);
// it only looks inside that element, because the new markup can mount while the old copy is briefly
// in the page too, and a page may hold hidden copies (the grid's phone layout), which leave the key
// for the visible one. Programmatic focus only shows a focus ring after keyboard use, so mouse users
// see no change.
let pendingKey: string | null = null;

export function KeepFocus() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const key = pendingKey;
    const scope = marker.current?.closest("table");
    const target = key && scope ? scope.querySelector<HTMLElement>(`[data-keep-focus="${CSS.escape(key)}"]`) : null;
    if (key && target?.checkVisibility()) {
      pendingKey = null;
      const active = document.activeElement as HTMLElement | null;
      // Only take focus from nowhere, or from the old copy of the same link that is about to go.
      if (!active || active === document.body || active.dataset.keepFocus === key) target.focus({ preventScroll: true });
    }

    // Capture phase, so the key is noted before the link starts navigating (Enter fires a click too).
    // Any other click clears it, so a stale key can never pull focus later.
    const remember = (event: MouseEvent) => {
      pendingKey = (event.target as Element | null)?.closest<HTMLElement>("[data-keep-focus]")?.dataset.keepFocus ?? null;
    };
    document.addEventListener("click", remember, true);
    return () => document.removeEventListener("click", remember, true);
  }, []);

  return <span ref={marker} hidden />;
}
