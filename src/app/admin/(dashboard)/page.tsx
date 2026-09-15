import { AlertTriangle, BarChart3, CheckCircle2, Clock3, Pill } from "lucide-react";

import { getAdminAnalytics } from "@/actions/analytics/analytics";
import { getProviderStatusCounts, getProviders } from "@/actions/providers/providers";
import { auth } from "@/auth";
import { AddPharmacyModal } from "@/components/admin/add-pharmacy-modal";
import { ProviderFunnelChart } from "@/components/admin/charts/provider-funnel-chart";
import { ProvidersTrendChart } from "@/components/admin/charts/providers-trend-chart";
import { StatusDonutChart } from "@/components/admin/charts/status-donut-chart";
import { Badge } from "@/components/common/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/common/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import Link from "@/components/Link";
import type { ProviderStatus } from "@/generated/prisma/client";
import { providerStatusLabels, providerStatusBadgeVariant } from "@/lib/provider-labels";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Staff dashboard", robots: { index: false, follow: false } };

const inReviewStatuses: ProviderStatus[] = ["DISCOVERED", "IDENTITY_VERIFIED", "ED_CATALOGUE_VERIFIED"];
const attentionStatuses: ProviderStatus[] = ["TEMPORARILY_WITHHELD", "ARCHIVED"];

export default async function AdminDashboardPage() {
  const [session, counts, recentProviders, analytics] = await Promise.all([
    auth(),
    getProviderStatusCounts(),
    getProviders(undefined, 5),
    getAdminAnalytics(),
  ]);

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
          <AddPharmacyModal />
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

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pipeline at a glance</h2>
        <Link href="/admin/analytics" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <BarChart3 aria-hidden="true" className="size-3.5" />
          Full analytics
        </Link>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <ProviderFunnelChart data={analytics.funnel} />
        <StatusDonutChart data={analytics.statusDistribution} />
        <ProvidersTrendChart data={analytics.providersByWeek} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recently added</CardTitle>
          <CardDescription>The newest entries in the provider catalogue.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentProviders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No providers yet.</p>
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
  );
}
