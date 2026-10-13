import { getClickReport } from "@/actions/analytics/click-report";
import { ClickBreakdownTable } from "@/components/admin/click-breakdown-table";
import { ClickReportTable } from "@/components/admin/click-report-table";
import { Button, buttonVariants } from "@/components/common/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import Link from "@/components/Link";
import { clickReportRangePresets, clickReportRangePresetValues, parseClickReportRange } from "@/lib/click-report-range";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Clicks to pharmacies", robots: { index: false, follow: false } };

const PAGE_PATH = "/admin/analytics/clicks";

export default async function ClickReportPage(props: PageProps<"/admin/analytics/clicks">) {
  const range = parseClickReportRange(await props.searchParams, new Date());
  const report = await getClickReport({ from: range.from, to: range.to });

  const totals = [
    { label: "Clicks to pharmacies", value: report.peopleClicks, hint: "Visitors sent to a pharmacy's website" },
    { label: "Pharmacies clicked", value: report.byPharmacy.length, hint: "Pharmacies that received at least one click" },
    { label: "Products clicked", value: report.byProduct.length, hint: "Strength and pack sizes visitors clicked on" },
    { label: "Filtered as likely bots", value: report.botClicks, hint: "Not counted in any figure on this page" },
  ];
  const breakdowns = [
    { title: "By pharmacy", description: "Every pharmacy visitors were sent to.", count: report.byPharmacy.length, table: <ClickReportTable rows={report.byPharmacy} showPharmacy /> },
    { title: "By product", description: "Which product, strength and pack size visitors clicked on, across all pharmacies.", count: report.byProduct.length, table: <ClickReportTable rows={report.byProduct} showProduct /> },
    { title: "By pharmacy and product", description: "Which product visitors clicked on at each pharmacy.", count: report.byPharmacyProduct.length, table: <ClickReportTable rows={report.byPharmacyProduct} showPharmacy showProduct /> },
    { title: "By area", description: "Roughly where visitors were when they clicked. We keep the town or city, never an address or IP address.", count: report.byLocation.length, table: <ClickBreakdownTable rows={report.byLocation} heading="Area" /> },
    { title: "By device", description: "Whether visitors clicked from a phone, tablet or computer, and its system.", count: report.byDevice.length, table: <ClickBreakdownTable rows={report.byDevice} heading="Device" /> },
    { title: "By browser", description: "The browser visitors were using.", count: report.byBrowser.length, table: <ClickBreakdownTable rows={report.byBrowser} heading="Browser" /> },
    { title: "By page", description: "The page of ours the visitor clicked from, including any filters they had chosen.", count: report.byPage.length, table: <ClickBreakdownTable rows={report.byPage} heading="Page" /> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Clicks to pharmacies</h1>
        <p className="mt-1 text-sm text-muted-foreground">How many visitors we sent to pharmacy websites, which pharmacies and products they chose, and where and how they clicked. Showing: {range.label}.</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end justify-between gap-3">
          <nav aria-label="Report period" className="flex flex-wrap gap-2">
            {clickReportRangePresetValues.map((preset) => (
              <Link
                key={preset}
                href={`${PAGE_PATH}?range=${preset}`}
                aria-current={range.preset === preset ? "page" : undefined}
                className={buttonVariants({ variant: range.preset === preset ? "default" : "outline", size: "sm" })}
              >
                {clickReportRangePresets[preset].label}
              </Link>
            ))}
          </nav>
          <form action={PAGE_PATH} className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              From
              <Input name="from" type="date" defaultValue={range.fromInput} className="w-40" />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              To
              <Input name="to" type="date" defaultValue={range.toInput} className="w-40" />
            </label>
            <Button type="submit" variant="outline">Apply dates</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {totals.map((total) => (
          <Card key={total.label}>
            <CardHeader>
              <CardDescription>{total.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{total.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">{total.hint}</CardContent>
          </Card>
        ))}
      </div>

      {breakdowns.map((breakdown) => (
        <Card key={breakdown.title}>
          <CardHeader>
            <CardTitle>{breakdown.title}</CardTitle>
            <CardDescription>{breakdown.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {breakdown.count === 0 ? <EmptyState title="No clicks to pharmacy sites in this period." /> : breakdown.table}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
