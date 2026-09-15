import { getAdminAnalytics } from "@/actions/analytics/analytics";
import { AuditActivityChart } from "@/components/admin/charts/audit-activity-chart";
import { CorrectionMixChart } from "@/components/admin/charts/correction-mix-chart";
import { EvidenceMixChart } from "@/components/admin/charts/evidence-mix-chart";
import { OfferAvailabilityChart } from "@/components/admin/charts/offer-availability-chart";
import { ProviderFunnelChart } from "@/components/admin/charts/provider-funnel-chart";
import { ProvidersTrendChart } from "@/components/admin/charts/providers-trend-chart";
import { PurchaseModelChart } from "@/components/admin/charts/purchase-model-chart";
import { RegulatorMixChart } from "@/components/admin/charts/regulator-mix-chart";
import { StaffByRoleChart } from "@/components/admin/charts/staff-by-role-chart";
import { StatusDonutChart } from "@/components/admin/charts/status-donut-chart";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analytics", robots: { index: false, follow: false } };

export default async function AnalyticsPage() {
  const analytics = await getAdminAnalytics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">A full view across the provider pipeline, catalogue and review queues.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ProviderFunnelChart data={analytics.funnel} />
        <StatusDonutChart data={analytics.statusDistribution} />
        <ProvidersTrendChart data={analytics.providersByWeek} />
        <RegulatorMixChart data={analytics.regulatorMix} />
        <OfferAvailabilityChart data={analytics.offerAvailabilityMix} />
        <PurchaseModelChart data={analytics.offerPurchaseModelMix} />
        <EvidenceMixChart data={analytics.evidenceMix} />
        <CorrectionMixChart data={analytics.correctionMix} />
        <AuditActivityChart data={analytics.auditActivityByDay} />
        <StaffByRoleChart data={analytics.staffByRole} />
      </div>
    </div>
  );
}
