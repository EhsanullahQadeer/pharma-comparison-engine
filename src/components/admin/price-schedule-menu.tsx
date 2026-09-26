"use client";

import { CalendarClock, Check, ChevronDown, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { updatePriceCollectionSchedules, updateVariantPriceSchedule } from "@/actions/price-collection/price-collection";
import type { BulkPriceScheduleState } from "@/actions/price-collection/price-collection";
import { Button } from "@/components/common/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/common/dropdown-menu";
import type { PriceScrapeCadence } from "@/generated/prisma/client";
import { priceScrapeCadenceLabels, priceScrapeCadenceValues } from "@/lib/catalogue-labels";

// What a schedule change applies to: every confirmed product page of a variant, or one pharmacy's page.
type PriceScheduleTarget = { kind: "variant"; variantId: string } | { kind: "match"; matchId: string };

function runSchedule(target: PriceScheduleTarget, cadence: PriceScrapeCadence): Promise<BulkPriceScheduleState> {
  return target.kind === "variant" ? updateVariantPriceSchedule(target.variantId, cadence) : updatePriceCollectionSchedules([target.matchId], cadence);
}

const triggerLabels: Record<PriceScrapeCadence | "MIXED", string> = { ...priceScrapeCadenceLabels, MANUAL: "Off", MIXED: "Mixed" };

const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function PriceScheduleMenu({ target, current, scope, nextScrapeAt }: {
  target: PriceScheduleTarget;
  current: PriceScrapeCadence | "MIXED";
  // Menu heading context, e.g. "Applies to 12 pharmacy product pages".
  scope: string;
  nextScrapeAt?: Date | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleSelect(cadence: PriceScrapeCadence) {
    if (cadence === current) return;
    startTransition(async () => {
      const result = await runSchedule(target, cadence);
      setError(result.error);
    });
  }

  return (
    <div className="flex min-w-36 flex-col items-start gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" size="sm" variant={current === "MANUAL" ? "outline" : "secondary"} disabled={isPending} />}>
          {isPending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <CalendarClock aria-hidden="true" className="size-4" />}
          {triggerLabels[current]}
          <ChevronDown aria-hidden="true" className="size-3.5" />
          <span className="sr-only"> — change automatic price refresh</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              Automatic price refresh
              <span className="block text-xs font-normal text-muted-foreground">{scope}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {priceScrapeCadenceValues.map((cadence) => (
              <DropdownMenuItem key={cadence} onClick={() => handleSelect(cadence)}>
                <Check aria-hidden="true" className={cadence === current ? "size-4" : "size-4 opacity-0"} />
                {priceScrapeCadenceLabels[cadence]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {nextScrapeAt && current !== "MANUAL" ? <p className="text-xs whitespace-nowrap text-muted-foreground">Next {dateFormatter.format(new Date(nextScrapeAt))}</p> : null}
      {error ? <p role="alert" className="max-w-48 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
