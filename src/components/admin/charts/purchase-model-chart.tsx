"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { AdminAnalytics } from "@/actions/analytics/analytics";
import { CHART_COLORS, ChartCard, EmptyChartState } from "@/components/admin/charts/chart-card";
import { purchaseModelLabels } from "@/lib/catalogue-labels";

export function PurchaseModelChart({ data }: { data: AdminAnalytics["offerPurchaseModelMix"] }) {
  const chartData = data.filter((entry) => entry.count > 0).map((entry) => ({ name: purchaseModelLabels[entry.purchaseModel], value: entry.count }));

  return (
    <ChartCard title="Purchase model" description="One-off vs. recurring (subscription) offers.">
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
