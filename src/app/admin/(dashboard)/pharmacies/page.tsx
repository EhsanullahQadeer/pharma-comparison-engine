import { Search } from "lucide-react";

import { getProviders } from "@/actions/providers/providers";
import { AddPharmacyModal } from "@/components/admin/add-pharmacy-modal";
import { PharmaciesTable } from "@/components/admin/pharmacies-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { getStaffUser } from "@/lib/staff-auth";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pharmacies", robots: { index: false, follow: false } };

export default async function AdminPharmaciesPage(props: PageProps<"/admin/pharmacies">) {
  const { q } = await props.searchParams;
  const query = typeof q === "string" ? q : undefined;
  const [providers, staffUser] = await Promise.all([getProviders(query), getStaffUser()]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pharmacies</h1>
          <p className="mt-1 text-sm text-muted-foreground">{providers.length} provider{providers.length === 1 ? "" : "s"}{query ? ` matching "${query}"` : " in the catalogue"}.</p>
        </div>
        <AddPharmacyModal />
      </div>
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-4">
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
            <PharmaciesTable providers={providers} role={staffUser?.role ?? null} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
