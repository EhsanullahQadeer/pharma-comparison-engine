import { ArrowRight, ShieldCheck } from "lucide-react";

import { Button } from "@/components/common/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { PharmacyAvatar } from "@/components/ed/pharmacy-avatar";
import Link from "@/components/Link";
import { formatShortDate } from "@/lib/comparison";
import { formatPence } from "@/lib/money";
import { regulatorShortLabels } from "@/lib/provider-labels";
import type { PublicProviderSummary } from "@/types/comparison";

// Directory rows as one scannable table; scrolls horizontally on narrow screens.
export function PharmacyTable({ providers }: { providers: PublicProviderSummary[] }) {
  return (
    <Table resizable={false} stickyHeader={false} aria-label="Checked pharmacies" className="min-w-3xl">
      <TableHeader>
        <TableRow>
          <TableHead>Pharmacy</TableHead>
          <TableHead>Registration</TableHead>
          <TableHead>Delivers to</TableHead>
          <TableHead className="text-right">From</TableHead>
          <TableHead>Evidence checked</TableHead>
          <TableHead className="text-right"><span className="sr-only">Profile</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {providers.map((provider) => (
          <TableRow key={provider.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <PharmacyAvatar name={provider.name} logoUrl={provider.logoUrl} />
                <div className="min-w-0">
                  <Link href={`/ed/pharmacies/${provider.slug}`} className="font-semibold underline-offset-4 hover:underline">{provider.name}</Link>
                  <p className="text-xs text-muted-foreground">{provider.websiteDomain}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium whitespace-nowrap">
                <ShieldCheck aria-hidden="true" className="size-3.5" />
                {regulatorShortLabels[provider.regulatorType]} {provider.regulatorReference}
              </span>
            </TableCell>
            <TableCell className="max-w-48 whitespace-normal text-muted-foreground">{provider.serviceRegions.length > 0 ? provider.serviceRegions.join(", ") : "Not listed"}</TableCell>
            <TableCell className="text-right tabular-nums">
              {provider.lowestPerTabletPence === null ? (
                <span className="text-muted-foreground">Prices being checked</span>
              ) : (
                <>
                  <span className="text-base font-semibold">{formatPence(provider.lowestPerTabletPence)}</span>
                  <span className="text-muted-foreground"> / tablet</span>
                  <p className="text-xs text-muted-foreground">{provider.offerCount} price{provider.offerCount === 1 ? "" : "s"} listed</p>
                </>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">{provider.evidenceCheckedAt ? formatShortDate(provider.evidenceCheckedAt) : "—"}</TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                nativeButton={false}
                render={
                  <Link href={`/ed/pharmacies/${provider.slug}`}>
                    View
                    <ArrowRight aria-hidden="true" className="size-4" />
                    <span className="sr-only"> {provider.name}</span>
                  </Link>
                }
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
