"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import {
  done,
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/lib/route-progress";

export function RouteProgressBar() {
  const pending = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const pathname = usePathname();

  useEffect(() => {
    done();
  }, [pathname]);

  useEffect(() => {
    window.addEventListener("pageshow", done);
    return () => window.removeEventListener("pageshow", done);
  }, []);

  if (!pending) return null;

  return (
    <div role="status" className="fixed inset-x-0 top-0 z-50 h-1 bg-primary/20">
      <div className="h-full w-2/3 animate-pulse bg-foreground motion-reduce:animate-none" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
