"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { AdminAnalytics } from "@/actions/analytics/analytics";
import { ChartCard, EmptyChartState } from "@/components/admin/charts/chart-card";

export function OutboundClicksChart({ data }: { data: AdminAnalytics["outboundClicks"] }) {
  const hasData = data.peopleClicks + data.botClicks > 0;

  return (
    <ChartCard
      title="Clicks to pharmacies"
      description={`"View at pharmacy" clicks per day, last 14 days: ${data.peopleClicks} counted, ${data.botClicks} filtered as likely bots.`}
    >
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.byDay} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="people" stackId="clicks" name="Counted" fill="var(--chart-1)" />
            <Bar dataKey="bots" stackId="clicks" name="Likely bots" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChartState message="No clicks to pharmacy sites yet." />
      )}
    </ChartCard>
  );
}
