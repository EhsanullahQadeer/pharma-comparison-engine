"use client";

import { useSyncExternalStore } from "react";

import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/route-progress";

import type { ReactNode } from "react";

// Swaps its content for a skeleton from the moment a link is clicked until the new page is on
// screen. A filter or sort link stays on the same route, so the route's loading file never shows
// for it; without this the old results sit there unchanged while the new ones load.
export function NavigationPending({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const pending = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return pending ? fallback : children;
}
