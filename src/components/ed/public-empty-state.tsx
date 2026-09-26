import { ArrowRight } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import Link from "@/components/Link";

import type { LucideIcon } from "lucide-react";

export function PublicEmptyState({ icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: { href: string; label: string } }) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      className="mt-10 gap-3 rounded-3xl border border-dashed border-border bg-card/60 py-16 motion-safe:animate-fade-up"
      action={action ? (
        <Link href={action.href} className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:gap-3 hover:bg-primary/80">
          {action.label}<ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      ) : undefined}
    />
  );
}
