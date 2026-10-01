import "dotenv/config";

import { collectSiteOffers } from "@/lib/price-collection/collect-site-offers";
import { prisma } from "@/lib/prisma";

// Reads every published pharmacy's website for its delivery charge and discount offers, one after
// another. Everything found is saved as "Needs approval" for staff — nothing is applied or shown
// publicly by this script. A website that can't be read is left as it was.

async function main() {
  const providers = await prisma.provider.findMany({ where: { status: "PUBLISHED" }, select: { id: true, tradingName: true, websiteDomain: true }, orderBy: { tradingName: "asc" } });
  console.warn(`Checking ${providers.length} published pharmacies…`);
  const totals = { deliveryFound: 0, newDeliveryPolicies: 0, newDiscounts: 0, unreadable: 0 };

  for (const [index, provider] of providers.entries()) {
    const label = `[${index + 1}/${providers.length}] ${provider.tradingName} (${provider.websiteDomain})`;
    try {
      const result = await collectSiteOffers(provider.id);
      totals.deliveryFound += Number(result.deliveryFound);
      totals.newDeliveryPolicies += Number(result.newDeliveryPolicy);
      totals.newDiscounts += result.newDiscounts;
      console.warn(`${label}: delivery ${result.deliveryFound ? (result.newDeliveryPolicy ? "found (new)" : "found (already known)") : "not found"}, ${result.newDiscounts} new discount(s)`);
    } catch (error) {
      totals.unreadable += 1;
      // Not recorded as a check: only a read that happened may mark a finding as gone from the site.
      console.warn(`${label}: could not be read — ${error instanceof Error ? error.message.split("\n").at(-1) : "unknown error"}`);
    }
  }

  console.warn(`Done: delivery charge found on ${totals.deliveryFound} of ${providers.length} (${totals.newDeliveryPolicies} new to review), ${totals.newDiscounts} new discount(s) to review, ${totals.unreadable} website(s) could not be read.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
