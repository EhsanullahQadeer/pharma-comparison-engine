"use client";

import { ArrowRight, Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/common/dropdown-menu";
import Link from "@/components/Link";
import { useQuery } from "@/hooks/useQuery";
import { pendingWorkIcons, pendingWorkLabels, pendingWorkTotal } from "@/lib/pending-work-labels";
import type { PendingWorkItem } from "@/types/pending-work";

const MAX_BADGE = 99;
const RECOUNT_EVERY_MS = 30_000;

// The header bell: how much work is waiting on this staff member, by kind. Seeded by the server
// and re-counted on every page change and whenever the menu is opened, so it stays current as
// work is done elsewhere in the admin.
export function PendingWorkMenu({ initialItems }: { initialItems: PendingWorkItem[] }) {
  const pathname = usePathname();
  const { data, refetch } = useQuery("pendingWork", undefined, { initialData: initialItems });
  const items = data ?? initialItems;
  const total = pendingWorkTotal(items);

  // Re-count without a page reload: on every page change, and whenever the server re-renders the
  // layout after a staff action (approve, dismiss, confirm, publish…), which hands down a new
  // `initialItems`.
  const seeded = useRef({ pathname, initialItems });
  useEffect(() => {
    if (seeded.current.pathname === pathname && seeded.current.initialItems === initialItems) return;
    seeded.current = { pathname, initialItems };
    void refetch();
  }, [pathname, initialItems, refetch]);

  // Work also arrives without any action here (a scheduled price check fails, a visitor sends a
  // message), so re-count while the tab is in view and when the staff member comes back to it.
  useEffect(() => {
    const recount = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    const timer = window.setInterval(recount, RECOUNT_EVERY_MS);
    document.addEventListener("visibilitychange", recount);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", recount);
    };
  }, [refetch]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (open) void refetch();
  }, [refetch]);

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={<Button type="button" variant="ghost" size="icon" className="relative" aria-label={total > 0 ? `Pending work: ${total} item${total === 1 ? "" : "s"}` : "Pending work: nothing waiting"} />}
      >
        <Bell aria-hidden="true" className="size-4" />
        {total > 0 && (
          <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-xs leading-none font-medium text-primary-foreground">
            {total > MAX_BADGE ? `${MAX_BADGE}+` : total}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <p className="px-1.5 py-1 text-xs font-medium text-muted-foreground">Pending work</p>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">Nothing is waiting for you.</p>
        ) : (
          items.map((item) => {
            const Icon = pendingWorkIcons[item.kind];
            return (
              <DropdownMenuItem key={item.kind} render={<Link href={item.href} />} className="justify-between gap-3 py-1.5">
                <span className="flex min-w-0 items-center gap-2">
                  <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                  <span className="truncate">{pendingWorkLabels[item.kind]}</span>
                </span>
                <Badge variant="secondary">{item.count}</Badge>
              </DropdownMenuItem>
            );
          })
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/admin#pending-work" />} className="justify-between text-muted-foreground">
          See all pending work
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
