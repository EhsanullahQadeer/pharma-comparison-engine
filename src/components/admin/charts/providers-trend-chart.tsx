"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { AdminAnalytics } from "@/actions/analytics/analytics";
import { ChartCard, EmptyChartState } from "@/components/admin/charts/chart-card";

export function ProvidersTrendChart({ data }: { data: AdminAnalytics["providersByWeek"] }) {
  const hasData = data.some((entry) => entry.count > 0);

  return (
    <ChartCard title="Providers added" description="New providers per week, last 12 weeks.">
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="count" name="New providers" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.25} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChartState />
      )}
    </ChartCard>
  );
}
