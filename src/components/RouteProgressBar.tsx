"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useSyncExternalStore } from "react";

import {
  done,
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/lib/route-progress";

// Ends the pending state once the new URL is on screen. The query string counts: a filter or sort
// link changes only that, and would otherwise leave the bar up until its timeout.
function RouteProgressEnd() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    done();
  }, [pathname, search]);

  return null;
}

export function RouteProgressBar() {
  const pending = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    window.addEventListener("pageshow", done);
    return () => window.removeEventListener("pageshow", done);
  }, []);

  return (
    <>
      {/* Reading the query string opts this subtree out of prerendering, so it gets its own boundary. */}
      <Suspense fallback={null}>
        <RouteProgressEnd />
      </Suspense>
      {pending ? (
        <div role="status" className="fixed inset-x-0 top-0 z-50 h-1 bg-primary/20">
          <div className="h-full w-2/3 animate-pulse bg-foreground motion-reduce:animate-none" />
          <span className="sr-only">Loading</span>
        </div>
      ) : null}
    </>
  );
}
