"use client";

import { useEffect } from "react";

// Brings the element named in the URL fragment (e.g. #offer-…) into view and marks it
// data-highlighted. Needed because the app's own navigation doesn't update CSS :target, and the
// element can stream in after the navigation, so the browser's jump-to-fragment misses it. Render it
// next to the elements it can point at, so it mounts once they exist. Only ids starting with
// `prefix` are handled; the element gets focus too (it needs tabIndex={-1}) so keyboard and screen
// reader users land on it as well.
export function HashHighlight({ prefix }: { prefix: string }) {
  useEffect(() => {
    const apply = () => {
      document.querySelectorAll("[data-highlighted]").forEach((element) => element.removeAttribute("data-highlighted"));
      const id = decodeURIComponent(window.location.hash.slice(1));
      const element = id.startsWith(prefix) ? document.getElementById(id) : null;
      if (!element) return;
      element.setAttribute("data-highlighted", "");
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      element.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
      element.focus({ preventScroll: true });
    };
    // After the router has finished its own scroll for this navigation.
    const frame = window.requestAnimationFrame(apply);
    window.addEventListener("hashchange", apply);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", apply);
    };
  }, [prefix]);
  return null;
}
