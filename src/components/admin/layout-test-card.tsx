import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/card";
import { phoneLayoutLabels } from "@/lib/phone-layout";
import type { LayoutTestRow } from "@/types/referrals";

const percent = new Intl.NumberFormat("en-GB", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

// The phone price-grid A/B test: each layout's phone page views, the clicks made from it, and
// click-through (clicks per page view). Layouts alternate by week, so compare whole weeks.
export function LayoutTestCard({ rows }: { rows: LayoutTestRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Phone layout test</CardTitle>
        <CardDescription>
          Phone visitors see layout A one week and layout B the next. Click-through is clicks to a pharmacy per phone page view of the price grid (not per person: nothing identifies a visitor). Run each layout for at least two full weeks before deciding.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.layout} className="rounded-xl border border-border p-4">
              <dt className="font-medium">Layout {phoneLayoutLabels[row.layout]}</dt>
              <dd className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <span><span className="block text-xs text-muted-foreground">Page views</span><span className="text-xl font-semibold tabular-nums">{row.pageViews.toLocaleString("en-GB")}</span></span>
                <span><span className="block text-xs text-muted-foreground">Clicks</span><span className="text-xl font-semibold tabular-nums">{row.clicks.toLocaleString("en-GB")}</span></span>
                <span><span className="block text-xs text-muted-foreground">Click-through</span><span className="text-xl font-semibold tabular-nums">{row.clickThrough === null ? "–" : percent.format(row.clickThrough)}</span></span>
              </dd>
              <p className="mt-2 text-xs text-muted-foreground">{row.days} day{row.days === 1 ? "" : "s"} with phone visits in this period.</p>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
