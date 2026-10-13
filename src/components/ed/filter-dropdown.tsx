"use client";

import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/common/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/common/dropdown-menu";
import Link from "@/components/Link";
import { cn } from "@/lib/utils";
import type { FilterOptionGroup } from "@/types/comparison";

// One filter as a dropdown of plain links (server-rendered query params), so every choice shows
// the route progress bar and has a shareable URL. `selected` marks a choice other than the default.
export function FilterDropdown({ label, value, selected, groups }: { label: string; value: string; selected: boolean; groups: FilterOptionGroup[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span aria-hidden="true" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              aria-label={`${label}: ${value}`}
              className={cn("h-11 w-full justify-between gap-2 rounded-xl px-3.5 text-sm font-normal", selected && "border-primary bg-primary/10 font-medium hover:bg-primary/15")}
            />
          }
        >
          <span className="truncate">{value}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-72 min-w-44 rounded-xl p-1.5">
          {groups.map((group, index) => (
            <DropdownMenuGroup key={group.label ?? index}>
              {index > 0 ? <DropdownMenuSeparator /> : null}
              {group.label ? <DropdownMenuLabel>{group.label}</DropdownMenuLabel> : null}
              {group.options.map((option) => (
                <DropdownMenuItem
                  key={option.href}
                  render={<Link href={option.href} scroll={false} aria-current={option.active ? "true" : undefined} />}
                  className={cn("justify-between gap-3 rounded-lg px-2.5 py-2", option.active && "font-medium")}
                >
                  {option.label}
                  {option.active ? <Check aria-hidden="true" className="text-primary" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
