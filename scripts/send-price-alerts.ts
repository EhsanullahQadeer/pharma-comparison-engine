import "dotenv/config";

import { getPublicOffers } from "@/actions/offers/public-offers";
import { comparisonHref } from "@/lib/comparison";
import { edHref } from "@/lib/ed-pages";
import { edProducts, productOffers, productPath } from "@/lib/ed-products";
import { mailerConfigured, sendEmail } from "@/lib/mailer";
import { ALERT_LIFETIME_MS, alertDecision, alertTargetLabel, lowestTotalPence, priceDropEmail, UNCONFIRMED_TTL_MS } from "@/lib/price-alerts";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site-url";

// Emails confirmed price alerts whose target price has been reached, using the same published,
// in-stock delivered totals the public grid shows. Also deletes unconfirmed sign-ups after 48 hours
// and alerts older than a year, so addresses aren't kept longer than the alert needs them.
// Run on a schedule after price collection: `npm run price-alerts:send` (see
// deploy/price-alerts.timer). Safe to run as often as you like — each alert emails at most daily.

async function main() {
  if (!mailerConfigured() || !siteUrl) throw new Error("Set SMTP_HOST, MAIL_FROM and NEXT_PUBLIC_SITE_URL before sending price alerts.");
  const now = new Date();
  const expired = await prisma.priceAlert.deleteMany({
    where: { OR: [{ confirmedAt: null, createdAt: { lt: new Date(now.getTime() - UNCONFIRMED_TTL_MS) } }, { createdAt: { lt: new Date(now.getTime() - ALERT_LIFETIME_MS) } }] },
  });

  const [alerts, offers] = await Promise.all([prisma.priceAlert.findMany({ where: { confirmedAt: { not: null } } }), getPublicOffers()]);
  const totals = { sent: 0, reset: 0, failed: 0 };

  for (const alert of alerts) {
    const product = edProducts.find((entry) => entry.slug === alert.productSlug);
    if (!product) continue;
    const lowest = lowestTotalPence(productOffers(offers, product), alert.strengthMg, alert.packQuantity);
    const decision = alertDecision(alert, lowest, now);
    if (decision === "reset") {
      await prisma.priceAlert.update({ where: { id: alert.id }, data: { lastNotifiedPence: null } });
      totals.reset += 1;
    }
    if (decision !== "notify" || lowest === null) continue;
    const message = priceDropEmail({
      target: alertTargetLabel(product.name, alert.strengthMg, alert.packQuantity),
      thresholdPence: alert.thresholdPence,
      lowestPence: lowest,
      compareUrl: new URL(comparisonHref({ packQuantity: alert.packQuantity, column: alert.strengthMg }, edHref(productPath(product))), siteUrl).href,
      manageUrl: new URL(edHref(`alerts/${alert.token}`), siteUrl).href,
    });
    try {
      await sendEmail({ to: alert.email, ...message, unsubscribeUrl: new URL(edHref(`alerts/${alert.token}`), siteUrl).href });
      await prisma.priceAlert.update({ where: { id: alert.id }, data: { lastNotifiedAt: now, lastNotifiedPence: lowest } });
      totals.sent += 1;
    } catch (error) {
      // Left as it was, so the next run tries again.
      totals.failed += 1;
      console.warn(`Alert ${alert.id}: email failed — ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  console.warn(`Price alerts: ${alerts.length} active, ${totals.sent} emailed, ${totals.reset} re-armed, ${totals.failed} failed, ${expired.count} expired sign-ups deleted.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
