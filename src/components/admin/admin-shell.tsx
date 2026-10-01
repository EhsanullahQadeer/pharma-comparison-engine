"use client";

import { type ReactNode, useState } from "react";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/common/sheet";
import type { StaffRole } from "@/generated/prisma/client";
import { siteConfig } from "@/lib/site-config";
import type { PendingWorkItem } from "@/types/pending-work";


export function AdminShell({
  user,
  pendingWork,
  children,
}: {
  user: { name: string; email: string; role: StaffRole };
  pendingWork: PendingWorkItem[];
  children: ReactNode;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <AdminSidebar
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((value) => !value)}
      />

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-sidebar-border">
            <SheetTitle>{siteConfig.brandShortName}</SheetTitle>
          </SheetHeader>
          <AdminNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <AdminHeader
          user={user}
          pendingWork={pendingWork}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 bg-card mx-4 px-4 py-6 lg:px-6 lg:py-8 rounded-2xl"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
