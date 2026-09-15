"use client";

import { useState, useTransition } from "react";

import { transitionProviderStatus } from "@/actions/providers/providers";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import type { ProviderStatus, StaffRole } from "@/generated/prisma/client";
import { confirm } from "@/lib/confirm-store";
import { providerStatusBadgeVariant, providerStatusLabels } from "@/lib/provider-labels";
import { getAllowedNextStatuses } from "@/lib/provider-status-transitions";

const destructiveStatuses: ProviderStatus[] = ["TEMPORARILY_WITHHELD", "ARCHIVED"];

export function ProviderStatusControl({
  providerId,
  status,
  role,
}: {
  providerId: string;
  status: ProviderStatus;
  role: StaffRole;
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
