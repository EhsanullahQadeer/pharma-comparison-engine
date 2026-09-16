import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// Shared "nothing here yet" block — replaces the same hand-rolled <p className="text-center
// text-sm text-muted-foreground"> pattern that had drifted across ~10 admin list/detail pages.
export function EmptyState({ icon: Icon, title, description, action, className }: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2 px-4 py-8 text-center", className)}>
      {Icon ? <Icon aria-hidden="true" className="size-6 text-muted-foreground" /> : null}
      <p className="text-sm text-muted-foreground">{title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}
