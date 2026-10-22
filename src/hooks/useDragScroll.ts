import { useEffect, useRef, useState } from "react";

// How far the mouse must move before a press becomes a drag (so a plain click still clicks).
const DRAG_THRESHOLD_PX = 5;
// Presses that start here keep their normal behaviour (selecting a discount code, typing).
const NO_DRAG_SELECTOR = "code, input, textarea, select, [contenteditable], [data-no-drag-scroll]";

type ScrollEdges = { overflow: boolean; atStart: boolean; atEnd: boolean };

const initialEdges: ScrollEdges = { overflow: false, atStart: true, atEnd: true };

// Sideways mouse drag-to-scroll for an overflowing box, plus which edges it's scrolled to. Mouse only:
// touch and touchpads already scroll natively. A drag that started on a link swallows the click that
// follows, so letting go never opens the link. While dragging the box carries `data-dragging`.
export function useDragScroll<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState<ScrollEdges>(initialEdges);

  useEffect(() => {
    const box = ref.current;
    if (!box || !enabled) return;

    const updateEdges = () => {
      const max = box.scrollWidth - box.clientWidth;
      const next = { overflow: max > 1, atStart: box.scrollLeft <= 1, atEnd: box.scrollLeft >= max - 1 };
      setEdges((prev) => (prev.overflow === next.overflow && prev.atStart === next.atStart && prev.atEnd === next.atEnd ? prev : next));
    };
    updateEdges();
    const resize = new ResizeObserver(updateEdges);
    resize.observe(box);
    if (box.firstElementChild) resize.observe(box.firstElementChild);

    let press: { pointerId: number; startX: number; startLeft: number; dragging: boolean } | null = null;
    let swallowClick = false;

    const onPointerDown = (event: PointerEvent) => {
      swallowClick = false;
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      if (box.scrollWidth <= box.clientWidth) return;
      if ((event.target as Element).closest(NO_DRAG_SELECTOR)) return;
      press = { pointerId: event.pointerId, startX: event.clientX, startLeft: box.scrollLeft, dragging: false };
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!press || event.pointerId !== press.pointerId) return;
      const dx = event.clientX - press.startX;
      if (!press.dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
        press.dragging = true;
        box.setPointerCapture(event.pointerId);
        box.dataset.dragging = "";
        window.getSelection()?.removeAllRanges();
      }
      event.preventDefault();
      box.scrollLeft = press.startLeft - dx;
    };

    const endPress = (event: PointerEvent) => {
      if (!press || event.pointerId !== press.pointerId) return;
      if (press.dragging) {
        swallowClick = event.type === "pointerup";
        if (box.hasPointerCapture(event.pointerId)) box.releasePointerCapture(event.pointerId);
        delete box.dataset.dragging;
      }
      press = null;
    };

    const onClickCapture = (event: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.preventDefault();
      event.stopPropagation();
    };

    // Links and images are natively draggable; that would take over the press instead of scrolling.
    const onDragStart = (event: DragEvent) => {
      if (box.scrollWidth > box.clientWidth) event.preventDefault();
    };

    box.addEventListener("scroll", updateEdges, { passive: true });
    box.addEventListener("pointerdown", onPointerDown);
    box.addEventListener("pointermove", onPointerMove);
    box.addEventListener("pointerup", endPress);
    box.addEventListener("pointercancel", endPress);
    box.addEventListener("click", onClickCapture, true);
    box.addEventListener("dragstart", onDragStart);
    return () => {
      resize.disconnect();
      box.removeEventListener("scroll", updateEdges);
      box.removeEventListener("pointerdown", onPointerDown);
      box.removeEventListener("pointermove", onPointerMove);
      box.removeEventListener("pointerup", endPress);
      box.removeEventListener("pointercancel", endPress);
      box.removeEventListener("click", onClickCapture, true);
      box.removeEventListener("dragstart", onDragStart);
      delete box.dataset.dragging;
    };
  }, [enabled]);

  return { ref, edges };
}
