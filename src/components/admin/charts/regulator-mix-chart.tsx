"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { AdminAnalytics } from "@/actions/analytics/analytics";
import { CHART_COLORS, ChartCard, EmptyChartState } from "@/components/admin/charts/chart-card";
import { regulatorTypeLabels } from "@/lib/provider-labels";

export function RegulatorMixChart({ data }: { data: AdminAnalytics["regulatorMix"] }) {
  const chartData = data.filter((entry) => entry.count > 0).map((entry) => ({ name: regulatorTypeLabels[entry.regulatorType], value: entry.count }));

  return (
    <ChartCard title="Regulator mix" description="GPhC vs. PSNI-registered providers.">
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Pie data={chartData} dataKey="value" nameKey="name" outerRadius="80%">
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
