import { BellOff, BellRing, CircleAlert } from "lucide-react";

import { confirmPriceAlert, deletePriceAlert, getPriceAlertByToken } from "@/actions/price-alerts/price-alerts";
import { Button } from "@/components/common/button";
import { PageShell } from "@/components/ed/page-shell";
import Link from "@/components/Link";
import { comparisonHref } from "@/lib/comparison";
import { edHref } from "@/lib/ed-pages";
import { formatPence } from "@/lib/money";
import { alertTargetLabel } from "@/lib/price-alerts";

import type { Metadata } from "next";
import type { ReactNode } from "react";

// A private page reached only from an alert's own email link: never indexed, never cached.
export const metadata: Metadata = {
  title: "Your price alert",
  description: "Confirm, keep or stop your price alert.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function Panel({ icon: Icon, title, children }: { icon: typeof BellRing; title: string; children: ReactNode }) {
  return (
    <section className="mt-10 max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-(--shadow) sm:p-8">
      <Icon aria-hidden="true" className="size-8 text-foreground" />
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      <div className="mt-2 space-y-4 text-muted-foreground">{children}</div>
    </section>
  );
}

export default async function PriceAlertPage(props: PageProps<"/ed/alerts/[token]">) {
  const { token } = await props.params;
  const alert = await getPriceAlertByToken(token);
  const shell = { title: "Your price alert", eyebrow: "Prices / Price alerts", description: "We email you when a price you're watching reaches your target.", crumbs: [{ label: "Home", href: "/" }] };

  if (!alert) {
    return (
      <PageShell {...shell}>
        <Panel icon={CircleAlert} title="This alert has been stopped">
          <p>There&apos;s no active alert for this link. It may have been stopped, or not confirmed within 48 hours, and we no longer hold the email address it was for.</p>
          <p><Link href="/ed/compare" className="underline underline-offset-4 hover:text-foreground">Compare prices</Link> to set up a new one.</p>
        </Panel>
      </PageShell>
    );
  }

  const target = alertTargetLabel(alert.productName, alert.strengthMg, alert.packQuantity);
  const pricesHref = comparisonHref({ packQuantity: alert.packQuantity, column: alert.strengthMg }, edHref(`prices/${alert.productSlug}`));
  const stop = (
    <form action={deletePriceAlert.bind(null, token)}>
      <Button type="submit" variant="outline" className="rounded-full"><BellOff aria-hidden="true" className="size-4" />Stop this alert</Button>
    </form>
  );

  return (
    <PageShell {...shell}>
      {alert.confirmed ? (
        <Panel icon={BellRing} title="Your price alert is on">
          <p>We&apos;ll email you when <strong className="text-foreground">{target}</strong> costs <strong className="text-foreground">{formatPence(alert.thresholdPence)}</strong> or less, including delivery, at any listed pharmacy. At most one email a day.</p>
          <p><Link href={pricesHref} className="underline underline-offset-4 hover:text-foreground">See today&apos;s prices</Link></p>
          {stop}
        </Panel>
      ) : (
        <Panel icon={BellRing} title="Confirm your price alert">
          <p>Email me when <strong className="text-foreground">{target}</strong> costs <strong className="text-foreground">{formatPence(alert.thresholdPence)}</strong> or less, including delivery.</p>
          <p className="text-sm">We only use your email address for this alert. Stopping it deletes the address; so does not confirming within 48 hours.</p>
          <div className="flex flex-wrap gap-3">
            <form action={confirmPriceAlert.bind(null, token)}>
              <Button type="submit" className="rounded-full"><BellRing aria-hidden="true" className="size-4" />Confirm alert</Button>
            </form>
            {stop}
          </div>
        </Panel>
      )}
    </PageShell>
  );
}
