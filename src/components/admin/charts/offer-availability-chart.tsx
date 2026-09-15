"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { AdminAnalytics } from "@/actions/analytics/analytics";
import { CHART_COLORS, ChartCard, EmptyChartState } from "@/components/admin/charts/chart-card";
import { availabilityLabels } from "@/lib/catalogue-labels";

export function OfferAvailabilityChart({ data }: { data: AdminAnalytics["offerAvailabilityMix"] }) {
  const chartData = data.map((entry) => ({ name: availabilityLabels[entry.availability], value: entry.count }));
  const hasData = chartData.some((entry) => entry.value > 0);

  return (
    <ChartCard title="Offer availability" description="Current stock status across every offer.">
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" name="Offers" radius={[4, 4, 0, 0]}>
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
