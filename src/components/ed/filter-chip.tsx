import Link from "@/components/Link";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

// Filters are plain links (server-rendered query params), so they work without JS, show the route
// progress bar and give every combination a shareable URL.
export function FilterChip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm transition-all duration-200 focus-visible:outline-2 focus-visible:outline-ring active:scale-95",
        active ? "border-primary bg-primary font-medium text-primary-foreground shadow-(--shadow)" : "border-border bg-background hover:-translate-y-px hover:border-primary/50 hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}

export function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <p className="w-24 shrink-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
