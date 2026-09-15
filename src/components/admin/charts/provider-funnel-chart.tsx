"use client";

import { Cell, Funnel, FunnelChart, LabelList, ResponsiveContainer, Tooltip } from "recharts";

import type { AdminAnalytics } from "@/actions/analytics/analytics";
import { CHART_COLORS, ChartCard, EmptyChartState } from "@/components/admin/charts/chart-card";
import { providerStatusLabels } from "@/lib/provider-labels";

export function ProviderFunnelChart({ data }: { data: AdminAnalytics["funnel"] }) {
  const chartData = data.map((entry, index) => ({
    name: providerStatusLabels[entry.stage],
    value: entry.count,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));
  const hasData = chartData.some((entry) => entry.value > 0);

  return (
    <ChartCard title="Provider pipeline" description="Where currently-active providers sit in the review pipeline right now.">
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart>
            <Tooltip />
            <Funnel dataKey="value" data={chartData} isAnimationActive>
              <LabelList position="right" dataKey="name" className="fill-foreground text-xs" stroke="none" />
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChartState />
      )}
    </ChartCard>
  );
}
