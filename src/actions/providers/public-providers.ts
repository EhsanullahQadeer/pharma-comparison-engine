"use server";

import { getPublicOffers } from "@/actions/offers/public-offers";
import { displayName, providerSlug } from "@/lib/comparison";
import { prisma } from "@/lib/prisma";
import type { PublicOffer, PublicProviderProfile, PublicProviderSummary } from "@/types/comparison";

const summarySelect = {
  id: true,
  tradingName: true,
  legalName: true,
  websiteDomain: true,
  logoUrl: true,
  regulatorType: true,
  regulatorReference: true,
  serviceRegions: true,
  evidence: { where: { approvedStatus: "APPROVED" }, orderBy: { checkedAt: "desc" }, select: { id: true, sourceUrl: true, checkedAt: true } },
} as const;

type ProviderRow = Awaited<ReturnType<typeof findPublishedProviders>>[number];

function findPublishedProviders() {
  return prisma.provider.findMany({ where: { status: "PUBLISHED" }, select: summarySelect, orderBy: { tradingName: "asc" } });
}

function toSummary(provider: ProviderRow, offers: PublicOffer[]): PublicProviderSummary {
  return {
    id: provider.id,
    slug: providerSlug(provider.websiteDomain),
    name: displayName(provider.tradingName),
    legalName: displayName(provider.legalName),
    websiteDomain: provider.websiteDomain,
    logoUrl: provider.logoUrl,
    regulatorType: provider.regulatorType,
    regulatorReference: provider.regulatorReference,
    serviceRegions: provider.serviceRegions,
    evidenceCheckedAt: provider.evidence[0]?.checkedAt ?? null,
    offerCount: offers.length,
    lowestPerTabletPence: offers.length > 0 ? Math.min(...offers.map((offer) => offer.perTabletPence)) : null,
  };
}

// Public directory — PUBLISHED providers only, each with a summary of its currently-visible prices.
export async function getPublicProviders(search?: string): Promise<PublicProviderSummary[]> {
  const [providers, offers] = await Promise.all([findPublishedProviders(), getPublicOffers()]);
  const needle = search?.trim().toLowerCase();
  return providers
    .filter((provider) => !needle || [provider.tradingName, provider.legalName, provider.websiteDomain].some((value) => value.toLowerCase().includes(needle)))
    .map((provider) => toSummary(provider, offers.filter((offer) => offer.providerId === provider.id)));
}

// Slugs are derived from the unique website domain, so resolve against the published set.
export async function getPublicProvider(slug: string): Promise<PublicProviderProfile | null> {
  const providers = await prisma.provider.findMany({ where: { status: "PUBLISHED" }, select: { id: true, websiteDomain: true } });
  const match = providers.find((provider) => providerSlug(provider.websiteDomain) === slug);
  if (!match) return null;

  const [provider, offers] = await Promise.all([
    prisma.provider.findUniqueOrThrow({ where: { id: match.id }, select: { ...summarySelect, dispensingPartnerName: true } }),
    getPublicOffers({ providerId: match.id }),
  ]);

  return {
    ...toSummary(provider, offers),
    dispensingPartnerName: provider.dispensingPartnerName,
    evidence: provider.evidence,
    offers,
  };
}

// Headline numbers for the directory's process pages: how many pharmacies are listed, and how many
// have been found so far (anything not archived is still in, or waiting for, our checks).
export async function getPublicDirectoryStats() {
  const [published, found] = await Promise.all([
    prisma.provider.count({ where: { status: "PUBLISHED" } }),
    prisma.provider.count({ where: { status: { not: "ARCHIVED" } } }),
  ]);
  return { published, found };
}
