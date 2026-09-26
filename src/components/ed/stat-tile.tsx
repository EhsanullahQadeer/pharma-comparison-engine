import { revealClass, revealStyle } from "@/lib/motion";

import type { LucideIcon } from "lucide-react";

export function StatTile({ icon: Icon, label, value, hint, index = 0 }: { icon: LucideIcon; label: string; value: string; hint?: string; index?: number }) {
  return (
    <div className={`group rounded-2xl border border-border bg-card p-5 shadow-(--shadow) transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 ${revealClass}`} style={revealStyle(index)}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 transition-transform duration-300 group-hover:scale-110">
          <Icon aria-hidden="true" className="size-3.5 text-foreground" />
        </span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
