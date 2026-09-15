import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, Clock3, Pill, Plus } from "lucide-react";
import { getProviderStatusCounts, getProviders } from "@/actions/providers/providers";
import { auth } from "@/auth";
import Link from "@/components/Link";
import { buttonVariants } from "@/components/common/button";
import { Badge } from "@/components/common/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/common/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import { providerStatusLabels, providerStatusBadgeVariant } from "@/lib/provider-labels";
import type { ProviderStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Staff dashboard", robots: { index: false, follow: false } };

const inReviewStatuses: ProviderStatus[] = ["DISCOVERED", "IDENTITY_VERIFIED", "ED_CATALOGUE_VERIFIED"];
const attentionStatuses: ProviderStatus[] = ["TEMPORARILY_WITHHELD", "ARCHIVED"];

export default async function AdminDashboardPage() {
  const [session, counts, recentProviders] = await Promise.all([auth(), getProviderStatusCounts(), getProviders(undefined, 5)]);

  const countByStatus = Object.fromEntries(counts.map((entry) => [entry.status, entry.count])) as Partial<Record<ProviderStatus, number>>;
  const total = counts.reduce((sum, entry) => sum + entry.count, 0);
  const sum = (statuses: ProviderStatus[]) => statuses.reduce((acc, status) => acc + (countByStatus[status] ?? 0), 0);

  const stats = [
    { label: "Total providers", value: total, icon: Pill },
    { label: "Published", value: countByStatus.PUBLISHED ?? 0, icon: CheckCircle2 },
    { label: "In review", value: sum(inReviewStatuses), icon: Clock3 },
    { label: "Needs attention", value: sum(attentionStatuses), icon: AlertTriangle },
  ];

  const firstName = session?.user.name.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      <Card className="bg-primary/10">
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Welcome back, {firstName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manual entry and discovery review — the pharmacy directory is the first delivery priority.</p>
          </div>
          <Link href="/admin/pharmacies/new" className={buttonVariants({ className: "gap-1.5" })}>
            <Plus aria-hidden="true" className="size-4" />
            Add pharmacy
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <stat.icon aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-semibold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Status breakdown</CardTitle>
            <CardDescription>Where every provider sits in the review pipeline.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.keys(providerStatusLabels) as ProviderStatus[]).map((status) => {
              const count = countByStatus[status] ?? 0;
              const width = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{providerStatusLabels[status]}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Recently added</CardTitle>
            <CardDescription>The newest entries in the provider catalogue.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {recentProviders.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No providers yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trading name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentProviders.map((provider) => (
                    <TableRow key={provider.id}>
                      <TableCell>
                        <p className="font-medium">{provider.tradingName}</p>
                        <p className="text-xs text-muted-foreground">{provider.websiteDomain}</p>
                      </TableCell>
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
    </div>
  );
}
