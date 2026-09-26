"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { AdminAnalytics } from "@/actions/analytics/analytics";
import { ChartCard, EmptyChartState } from "@/components/admin/charts/chart-card";

export function OutboundPharmacyChart({ data }: { data: AdminAnalytics["outboundClicks"]["byPharmacy"] }) {
  return (
    <ChartCard title="Clicks by pharmacy" description="Pharmacies visitors went to most, last 14 days (bots excluded).">
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
            <Tooltip />
            <Bar dataKey="count" name="Clicks" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChartState message="No clicks to pharmacy sites yet." />
      )}
    </ChartCard>
  );
}
