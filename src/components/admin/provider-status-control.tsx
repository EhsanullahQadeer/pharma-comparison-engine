"use client";

import { MoreHorizontal } from "lucide-react";
import { useState, useTransition } from "react";

import { transitionProviderStatus } from "@/actions/providers/providers";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/dropdown-menu";
import { TableCell } from "@/components/common/table";
import type { ProviderStatus, StaffRole } from "@/generated/prisma/client";
import { confirm } from "@/lib/confirm-store";
import { providerStatusBadgeVariant, providerStatusLabels } from "@/lib/provider-labels";
import { getAllowedNextStatuses } from "@/lib/provider-status-transitions";

const destructiveStatuses: ProviderStatus[] = ["TEMPORARILY_WITHHELD", "ARCHIVED"];

export function ProviderStatusControl({
  providerId,
  status,
  role,
  variant = "buttons",
}: {
  providerId: string;
  status: ProviderStatus;
  role: StaffRole;
  /** "buttons" (detail page — one button per transition) or "menu" (compact dropdown for a table row). */
  variant?: "buttons" | "menu";
}) {
  const [current, setCurrent] = useState(status);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const allowed = getAllowedNextStatuses(current, role);

  async function handleTransition(next: ProviderStatus) {
    if (destructiveStatuses.includes(next)) {
      const ok = await confirm({
        title: next === "ARCHIVED" ? "Archive this provider?" : "Withhold this provider?",
        message:
          next === "ARCHIVED"
            ? "Archived providers are removed from every public listing. This can be reversed later."
            : "Temporarily withheld providers stop showing publicly until reinstated.",
        confirmText: next === "ARCHIVED" ? "Archive" : "Withhold",
        variant: "destructive",
      });
      if (!ok) return;
    }

    setError(undefined);
    startTransition(async () => {
      const result = await transitionProviderStatus(providerId, next);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCurrent(next);
    });
  }

  if (variant === "menu") {
    return (
      <>
        <TableCell>
          <Badge variant={providerStatusBadgeVariant[current]}>{providerStatusLabels[current]}</Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex flex-col items-end gap-1">
            {allowed.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button type="button" size="icon" variant="ghost" disabled={isPending} aria-label="Change status" />}>
                  <MoreHorizontal aria-hidden="true" className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Change status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {allowed.map((next) => (
                      <DropdownMenuItem
                        key={next}
                        variant={destructiveStatuses.includes(next) ? "destructive" : "default"}
                        onClick={() => handleTransition(next)}
                      >
                        Move to {providerStatusLabels[next]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
        </TableCell>
      </>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant={providerStatusBadgeVariant[current]}>{providerStatusLabels[current]}</Badge>
      {allowed.map((next) => (
        <Button
          key={next}
          type="button"
          size="sm"
          variant={destructiveStatuses.includes(next) ? "destructive" : "outline"}
          disabled={isPending}
          onClick={() => handleTransition(next)}
        >
          Move to {providerStatusLabels[next]}
        </Button>
      ))}
      {allowed.length === 0 && <span className="text-xs text-muted-foreground">No further transitions available for your role.</span>}
      {error ? <p className="w-full text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
