"use client";

import { useMemo } from "react";

import type { getProviders } from "@/actions/providers/providers";
import { SelectAllCheckbox } from "@/components/admin/bulk-action-bar";
import { EditPharmacyModal } from "@/components/admin/edit-pharmacy-modal";
import { PublishAllOffersButton } from "@/components/admin/offer-publish-controls";
import { ProviderBulkActions } from "@/components/admin/provider-bulk-actions";
import { ProviderStatusControl } from "@/components/admin/provider-status-control";
import { Badge } from "@/components/common/badge";
import { Checkbox } from "@/components/common/checkbox";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import Link from "@/components/Link";
import type { StaffRole } from "@/generated/prisma/client";
import { useRowSelection } from "@/hooks/useRowSelection";
import { providerStatusLabels, providerStatusBadgeVariant, regulatorTypeLabels } from "@/lib/provider-labels";

type ProviderRow = Awaited<ReturnType<typeof getProviders>>[number];

// Without a staff role (no session) the table is read-only: no selection, status shown as a badge.
export function PharmaciesTable({ providers, role }: { providers: ProviderRow[]; role: StaffRole | null }) {
  const ids = useMemo(() => providers.map((provider) => provider.id), [providers]);
  const selection = useRowSelection(ids);
  const selectedProviders = useMemo(
    () => providers.filter((provider) => selection.selectedIds.includes(provider.id)).map(({ id, status, _count }) => ({ id, status, draftCount: _count.offers })),
    [providers, selection.selectedIds],
  );

  return (
    <>
      {role ? <ProviderBulkActions providers={selectedProviders} role={role} onClear={selection.clear} /> : null}
      <Table>
        <TableHeader>
          <TableRow>
            {role ? (
              <TableHead className="w-10" resizable={false}>
                <SelectAllCheckbox allSelected={selection.allSelected} someSelected={selection.someSelected} onToggleAll={selection.toggleAll} label="Select all pharmacies" />
              </TableHead>
            ) : null}
            <TableHead>Trading name</TableHead>
            <TableHead>Website</TableHead>
            <TableHead>Regulator</TableHead>
            <TableHead>Service regions</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {providers.map((provider) => {
            const selected = selection.isSelected(provider.id);
            return (
              <TableRow key={provider.id} data-state={selected ? "selected" : undefined} className="hover:bg-muted/50">
                {role ? (
                  <TableCell>
                    <Checkbox checked={selected} onCheckedChange={(checked) => selection.toggle(provider.id, checked === true)} aria-label={`Select ${provider.tradingName}`} />
                  </TableCell>
                ) : null}
                <TableCell className="font-medium">
                  <Link href={`/admin/pharmacies/${provider.id}`} className="block hover:underline">
                    {provider.tradingName}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <a
                    href={/^https?:\/\//.test(provider.websiteDomain) ? provider.websiteDomain : `https://${provider.websiteDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {provider.websiteDomain}
                  </a>
                </TableCell>
                <TableCell>{regulatorTypeLabels[provider.regulatorType]}</TableCell>
                <TableCell className="text-muted-foreground">{provider.serviceRegions.join(", ") || "—"}</TableCell>
                {role ? (
                  // Keyed on status so the row's control picks up a bulk move.
                  <ProviderStatusControl
                    key={provider.status}
                    providerId={provider.id}
                    status={provider.status}
                    role={role}
                    variant="menu"
                    extraActions={
                      <>
                        <PublishAllOffersButton providerId={provider.id} draftCount={provider._count.offers} providerPublished={provider.status === "PUBLISHED"} compact />
                        <EditPharmacyModal provider={provider} compact />
                      </>
                    }
                  />
                ) : (
                  <>
                    <TableCell>
                      <Badge variant={providerStatusBadgeVariant[provider.status]}>{providerStatusLabels[provider.status]}</Badge>
                    </TableCell>
                    <TableCell />
                  </>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
