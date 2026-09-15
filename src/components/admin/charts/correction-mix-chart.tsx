"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { AdminAnalytics } from "@/actions/analytics/analytics";
import { CHART_COLORS, ChartCard, EmptyChartState } from "@/components/admin/charts/chart-card";
import { correctionStatusLabels } from "@/lib/review-labels";

export function CorrectionMixChart({ data }: { data: AdminAnalytics["correctionMix"] }) {
  const chartData = data.map((entry) => ({ name: correctionStatusLabels[entry.status], value: entry.count }));
  const hasData = chartData.some((entry) => entry.value > 0);

  return (
    <ChartCard title="Correction status" description="Reported issues, by resolution status.">
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
            <Tooltip />
            <Bar dataKey="value" name="Corrections" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChartState />
      )}
    </ChartCard>
  );
}
