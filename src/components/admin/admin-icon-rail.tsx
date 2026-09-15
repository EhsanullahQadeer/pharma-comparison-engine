"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import Link from "@/components/Link";
import { adminNavSections } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

const allItems = adminNavSections.flatMap((section) => section.items);

export function AdminIconRail({ onToggle }: { onToggle: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-18 shrink-0 flex-col items-center gap-2 bg-sidebar-rail py-3 text-sidebar-rail-foreground">
      <button
        type="button"
        onClick={onToggle}
        aria-label="Toggle sidebar panel"
        className="flex size-11 items-center justify-center rounded-xl text-sidebar-rail-foreground/70 transition-colors hover:bg-white/10 hover:text-sidebar-rail-foreground"
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>
      <div className="my-1 h-px w-8 bg-sidebar-rail-foreground/15" />
      <nav className="flex flex-col items-center gap-2">
        {allItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex size-11 items-center justify-center rounded-xl text-sidebar-rail-foreground/70 transition-colors hover:bg-white/10 hover:text-sidebar-rail-foreground",
                active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
              )}
            >
              <item.icon aria-hidden="true" className="size-5" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
