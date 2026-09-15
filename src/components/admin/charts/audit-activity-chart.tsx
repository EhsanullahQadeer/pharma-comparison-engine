"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { AdminAnalytics } from "@/actions/analytics/analytics";
import { ChartCard, EmptyChartState } from "@/components/admin/charts/chart-card";

export function AuditActivityChart({ data }: { data: AdminAnalytics["auditActivityByDay"] }) {
  const hasData = data.some((entry) => entry.CREATE + entry.UPDATE + entry.DELETE > 0);

  return (
    <ChartCard title="Audit activity" description="Staff changes per day, last 14 days.">
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="CREATE" stackId="actions" name="Created" fill="var(--chart-1)" />
            <Bar dataKey="UPDATE" stackId="actions" name="Updated" fill="var(--chart-2)" />
            <Bar dataKey="DELETE" stackId="actions" name="Deleted" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChartState />
      )}
    </ChartCard>
  );
}
