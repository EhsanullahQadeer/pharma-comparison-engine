"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { AdminAnalytics } from "@/actions/analytics/analytics";
import { CHART_COLORS, ChartCard, EmptyChartState } from "@/components/admin/charts/chart-card";
import { providerStatusLabels } from "@/lib/provider-labels";

export function StatusDonutChart({ data }: { data: AdminAnalytics["statusDistribution"] }) {
  const chartData = data.filter((entry) => entry.count > 0).map((entry) => ({ name: providerStatusLabels[entry.status], value: entry.count }));

  return (
    <ChartCard title="Status distribution" description="Every provider, by current status.">
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
              {chartData.map((entry, index) => (
                <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChartState />
      )}
    </ChartCard>
  );
}
