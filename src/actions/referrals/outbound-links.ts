// Server-only read (not "use server": nothing needs a public endpoint for it). Which published
// pharmacies get a link to their website on public pages. Affiliate-approved pharmacies are linked;
// every other published pharmacy stays fully listed, priced and ranked, just without a URL.
// Only decides whether a link is rendered — ranking code never reads this.

import { cache } from "react";

import { displayName, providerSlug } from "@/lib/comparison";
import { prisma } from "@/lib/prisma";
import type { LinkedProvider } from "@/types/referrals";

// Also the public disclosure list on the independence and partners pages, so what we say and what
// we link can't drift apart.
export const getLinkedProviders = cache(async (): Promise<LinkedProvider[]> => {
  const providers = await prisma.provider.findMany({
    where: { status: "PUBLISHED", affiliateApproved: true },
    select: { id: true, tradingName: true, websiteDomain: true },
  });
  return providers
    .map((provider) => ({ id: provider.id, name: displayName(provider.tradingName), slug: providerSlug(provider.websiteDomain) }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

export const getLinkedProviderIds = cache(async (): Promise<ReadonlySet<string>> => {
  return new Set((await getLinkedProviders()).map((provider) => provider.id));
});
