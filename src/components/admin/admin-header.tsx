"use client";

import { useState } from "react";
import { Bell, LogOut, Menu, Search } from "lucide-react";
import { staffSignOut } from "@/actions/auth/sign-out";
import { Button } from "@/components/common/button";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { AdminSearchModal } from "@/components/admin/admin-search-modal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { staffRoleLabels } from "@/lib/staff-role-labels";
import type { StaffRole } from "@/generated/prisma/client";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

export function AdminHeader({
  user,
  onOpenMobileNav,
}: {
  user: { name: string; email: string; role: StaffRole };
  onOpenMobileNav: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 px-4 lg:px-6">
      <Button type="button" variant="ghost" size="icon" onClick={onOpenMobileNav} aria-label="Open navigation" className="lg:hidden">
        <Menu aria-hidden="true" className="size-4.5" />
      </Button>

      <Button type="button" variant="ghost" size="icon" onClick={() => setSearchOpen(true)} aria-label="Search pages">
        <Search aria-hidden="true" className="size-4" />
      </Button>
      <AdminSearchModal open={searchOpen} onOpenChange={setSearchOpen} />

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button type="button" variant="ghost" size="icon" aria-label="Notifications" />
            }
          >
            <Bell aria-hidden="true" className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <p className="px-1.5 py-1 text-xs font-medium text-muted-foreground">Notifications</p>
            <DropdownMenuSeparator />
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button type="button" variant="ghost" className="gap-2 pr-1.5 pl-1" />}
          >
            <Avatar size="sm">
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex flex-col gap-0.5 px-1.5 py-1.5">
              <span className="text-sm font-medium text-foreground">{user.name}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
              <span className="text-xs text-muted-foreground">{staffRoleLabels[user.role]}</span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => staffSignOut()}>
              <LogOut aria-hidden="true" className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
