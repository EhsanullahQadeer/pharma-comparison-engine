import { Search } from "lucide-react";

import { getProviders } from "@/actions/providers/providers";
import { AddPharmacyModal } from "@/components/admin/add-pharmacy-modal";
import { Badge } from "@/components/common/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import Link from "@/components/Link";
import { providerStatusLabels, providerStatusBadgeVariant, regulatorTypeLabels } from "@/lib/provider-labels";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pharmacies", robots: { index: false, follow: false } };

export default async function AdminPharmaciesPage(props: PageProps<"/admin/pharmacies">) {
  const { q } = await props.searchParams;
  const query = typeof q === "string" ? q : undefined;
  const providers = await getProviders(query);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pharmacies</h1>
          <p className="mt-1 text-sm text-muted-foreground">{providers.length} provider{providers.length === 1 ? "" : "s"}{query ? ` matching "${query}"` : " in the catalogue"}.</p>
        </div>
        <AddPharmacyModal />
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="text-sm text-muted-foreground">Provider catalogue</CardTitle>
          <form action="/admin/pharmacies" className="relative w-full max-w-xs">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" type="search" defaultValue={query} placeholder="Search by name or domain…" className="pl-8" />
          </form>
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <EmptyState title={query ? "No providers match that search." : "No providers yet. Add the first pharmacy manually to start the catalogue."} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trading name</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Regulator</TableHead>
                  <TableHead>Service regions</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Link href={`/admin/pharmacies/${provider.id}`} className="block hover:underline">
                        {provider.tradingName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{provider.websiteDomain}</TableCell>
                    <TableCell>{regulatorTypeLabels[provider.regulatorType]}</TableCell>
                    <TableCell className="text-muted-foreground">{provider.serviceRegions.join(", ") || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={providerStatusBadgeVariant[provider.status]}>{providerStatusLabels[provider.status]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
