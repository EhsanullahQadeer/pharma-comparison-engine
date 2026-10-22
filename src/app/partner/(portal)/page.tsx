import { MousePointerClick, Tags } from "lucide-react";

import { getPartnerHome } from "@/actions/partners/partner-portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { getPartnerUser } from "@/lib/partner-auth";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pharmacy portal", robots: { index: false, follow: false } };

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });

export default async function PartnerHomePage() {
  // The layout has already checked the account; both calls are scoped to its own pharmacy.
  const [partner, home] = await Promise.all([getPartnerUser(), getPartnerHome()]);

  const figures = [
    { icon: MousePointerClick, label: "Visitors sent to your site in the last 30 days", value: home.clicksLast30Days, note: "Clicks from our comparison to your website. Likely bots are left out." },
    { icon: Tags, label: "Your prices on our site", value: home.publishedPrices, note: "Read from your own website and ranked by price only." },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{partner?.providerName}</h1>
        <p className="text-sm text-muted-foreground">Counts only: we don&apos;t keep anything that identifies a visitor, so there&apos;s nothing like that to show.</p>
      </div>
      {partner?.accessEndsAt ? (
        <p role="status" className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
          Your partnership has ended. You can still see these figures until {dateFormat.format(partner.accessEndsAt)}.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {figures.map(({ icon: Icon, label, value, note }) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Icon aria-hidden="true" className="size-4" />{label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{value.toLocaleString("en-GB")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{note}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">More detail is on the way: clicks by day, by section of our site, by product and by your ranking position.</p>
    </div>
  );
}
