"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { AdminAnalytics } from "@/actions/analytics/analytics";
import { CHART_COLORS, ChartCard, EmptyChartState } from "@/components/admin/charts/chart-card";
import { referralPlacementLabels } from "@/lib/referral-labels";

export function OutboundPlacementChart({ data }: { data: AdminAnalytics["outboundClicks"] }) {
  const chartData = data.byPlacement.map((entry) => ({ name: referralPlacementLabels[entry.placement], value: entry.count }));
  const rankNote = data.topRankShare === null ? "" : ` ${data.topRankShare}% of clicks from a ranked list went to the #1 price.`;

  return (
    <ChartCard title="Clicks by page" description={`Where visitors clicked through from, last 14 days.${rankNote}`}>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
            <Tooltip />
            <Bar dataKey="value" name="Clicks" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChartState message="No clicks to pharmacy sites yet." />
      )}
    </ChartCard>
  );
}
