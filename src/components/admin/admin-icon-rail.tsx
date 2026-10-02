"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/common/popover";
import Link from "@/components/Link";
import { adminNavSections, type AdminNavSection } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

const railItemClass = "flex size-11 items-center justify-center rounded-xl text-sidebar-rail-foreground/70 transition-colors hover:bg-white/10 hover:text-sidebar-rail-foreground";
const railItemActiveClass = "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground";

// Each section is one icon on the rail; its pages open in a popover beside it on hover while the
// labelled panel is closed. A section with one page goes straight there on click; one with several
// opens the popover on click (or keyboard) instead.
function RailGroup({ section, pathname, openOnHover }: { section: AdminNavSection; pathname: string; openOnHover: boolean }) {
  const [open, setOpen] = useState(false);
  const Icon = section.items[0].icon;
  const active = section.items.some((item) => item.href === pathname);
  const onlyItem = section.items.length === 1 ? section.items[0] : null;

  return (
    // A single-page icon is a link: its click navigates, so it must not also pin the popover open.
    <Popover open={open} onOpenChange={(next, details) => setOpen(onlyItem && details.reason === "trigger-press" ? false : next)}>
      <PopoverTrigger
        openOnHover={openOnHover}
        delay={80}
        closeDelay={120}
        aria-label={onlyItem ? onlyItem.label : `${section.label} pages`}
        {...(onlyItem ? { nativeButton: false, render: <Link href={onlyItem.href} aria-current={active ? "page" : undefined} /> } : {})}
        className={cn(railItemClass, (active || open) && "bg-white/10 text-sidebar-rail-foreground", active && railItemActiveClass)}
      >
        <Icon aria-hidden="true" className="size-5" />
      </PopoverTrigger>
      <PopoverContent side="right" align="start" sideOffset={10} className="w-56 bg-sidebar p-2 text-sidebar-foreground">
        <PopoverTitle className="mb-1 px-3 py-1 text-xs font-semibold tracking-wide text-sidebar-foreground/60 uppercase">{section.label}</PopoverTitle>
        <ul className="space-y-1">
          {section.items.map((item) => {
            const itemActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={itemActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    itemActive && railItemActiveClass,
                  )}
                >
                  <item.icon aria-hidden="true" className="size-4.5 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function AdminIconRail({ panelOpen, onToggle }: { panelOpen: boolean; onToggle: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-18 shrink-0 flex-col items-center gap-2 bg-sidebar-rail py-3 text-sidebar-rail-foreground">
      <button type="button" onClick={onToggle} aria-label="Toggle sidebar panel" aria-expanded={panelOpen} className={railItemClass}>
        <Menu aria-hidden="true" className="size-5" />
      </button>
      <div className="my-1 h-px w-8 bg-sidebar-rail-foreground/15" />
      <nav aria-label="Admin sections" className="flex flex-col items-center gap-2">
        {adminNavSections.map((section) => <RailGroup key={section.label} section={section} pathname={pathname} openOnHover={!panelOpen} />)}
      </nav>
    </div>
  );
}
