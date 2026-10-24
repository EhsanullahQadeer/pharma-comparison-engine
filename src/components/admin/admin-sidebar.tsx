"use client";

import { AdminIconRail } from "@/components/admin/admin-icon-rail";
import { AdminNav } from "@/components/admin/admin-nav";
import { LogoMark } from "@/components/common/logo";
import Link from "@/components/Link";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export function AdminSidebar({ panelOpen, onTogglePanel }: { panelOpen: boolean; onTogglePanel: () => void }) {
  return (
    <aside className="sticky top-0 hidden h-dvh shrink-0 lg:flex">
      <AdminIconRail panelOpen={panelOpen} onToggle={onTogglePanel} />
      <div
        className={cn(
          "flex h-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground transition-[width] duration-200",
          panelOpen ? "w-56" : "w-0"
        )}
      >
        <div className="flex h-16 w-56 shrink-0 items-center px-4">
          <Link href="/admin" className="flex min-w-0 items-center gap-2 font-semibold"><LogoMark className="size-6" /><span className="truncate">{siteConfig.brandShortName}</span></Link>
        </div>
        <div className="w-56">
          <AdminNav />
        </div>
      </div>
    </aside>
  );
}
