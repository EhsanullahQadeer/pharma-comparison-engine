import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/common/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/card";
import Link from "@/components/Link";
import { pendingWorkIcons, pendingWorkLabels, pendingWorkTotal } from "@/lib/pending-work-labels";
import type { PendingWorkItem } from "@/types/pending-work";

const MAX_PHARMACIES = 12;

// The dashboard's full list of what is waiting on this staff member, including which pharmacies
// each pharmacy-level kind of work is on. The header bell shows the same counts in brief.
export function PendingWorkCard({ items }: { items: PendingWorkItem[] }) {
  const total = pendingWorkTotal(items);
  return (
    <Card id="pending-work" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Pending work</CardTitle>
        <CardDescription>
          {total > 0 ? `${total} item${total === 1 ? "" : "s"} waiting for a staff decision.` : "Nothing is waiting for you."}
        </CardDescription>
      </CardHeader>
      {items.length > 0 && (
        <CardContent>
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const Icon = pendingWorkIcons[item.kind];
              const pharmacies = item.pharmacies ?? [];
              const hidden = pharmacies.length - MAX_PHARMACIES;
              return (
                <li key={item.kind} className="space-y-2 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                      {pendingWorkLabels[item.kind]}
                      <Badge variant="secondary">{item.count}</Badge>
                    </span>
                    {pharmacies.length === 0 && (
                      <Link href={item.href} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        Open
                        <ArrowRight aria-hidden="true" className="size-3.5" />
                      </Link>
                    )}
                  </div>
                  {pharmacies.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {pharmacies.slice(0, MAX_PHARMACIES).map((pharmacy) => (
                        <li key={pharmacy.id}>
                          <Link href={`/admin/pharmacies/${pharmacy.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs hover:border-primary/50 hover:bg-accent">
                            {pharmacy.name}
                            <span className="text-muted-foreground tabular-nums">{pharmacy.count}</span>
                          </Link>
                        </li>
                      ))}
                      {hidden > 0 && <li className="px-1 py-1 text-xs text-muted-foreground">and {hidden} more</li>}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
