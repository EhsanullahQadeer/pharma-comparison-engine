// Server-only read (not "use server": nothing needs a public endpoint for it). Which published
// pharmacies are affiliate partners. Every published pharmacy gets a link to its website on public
// pages; a partner's link is additionally labelled as one we may earn from.
// Only decides how a link is labelled — ranking code never reads this.

import { cache } from "react";

import { displayName, providerSlug } from "@/lib/comparison";
import { prisma } from "@/lib/prisma";
import type { PartnerProvider } from "@/types/referrals";

// Also the public disclosure list on the independence and partners pages, so what we say and what
// we label can't drift apart.
export const getPartnerProviders = cache(async (): Promise<PartnerProvider[]> => {
  const providers = await prisma.provider.findMany({
    where: { status: "PUBLISHED", affiliateApproved: true },
    select: { id: true, tradingName: true, websiteDomain: true },
  });
  return providers
    .map((provider) => ({ id: provider.id, name: displayName(provider.tradingName), slug: providerSlug(provider.websiteDomain) }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

export const getPartnerProviderIds = cache(async (): Promise<ReadonlySet<string>> => {
  return new Set((await getPartnerProviders()).map((provider) => provider.id));
});
