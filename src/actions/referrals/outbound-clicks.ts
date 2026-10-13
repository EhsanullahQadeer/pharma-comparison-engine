// Server-only data access for the /go/[offerId] redirect (M7). Deliberately NOT a "use server"
// module: that would expose recordOutboundClick as a public POST endpoint anyone could call with
// forged clicks. Only the route handler imports these.

import type { ReferralPlacement } from "@/generated/prisma/client";
import { deliveredTotalPence } from "@/lib/comparison";
import { prisma } from "@/lib/prisma";
import { BOT_CLICKS_PER_HOUR, isAllowedDestination, VISITOR_HASH_TTL_MS } from "@/lib/referrals";
import type { ClickDetails, OutboundDestination } from "@/types/referrals";

const HOUR_MS = 60 * 60 * 1000;

// The same gate as the public comparison (published offer from a PUBLISHED provider) plus a
// destination check, so /go can only ever send a visitor to a reviewed pharmacy's own site. Every
// published pharmacy is linked and counted; only an affiliate-approved one uses its tracked link.
export async function resolveOutboundDestination(offerId: string): Promise<OutboundDestination | null> {
  const offer = await prisma.offer.findFirst({
    where: { id: offerId, publishedAt: { not: null }, provider: { status: "PUBLISHED" } },
    select: {
      id: true,
      sourceUrl: true,
      providerId: true,
      productVariantId: true,
      itemPricePence: true,
      deliveryFeePence: true,
      consultationFeePence: true,
      otherMandatoryFeesPence: true,
      provider: { select: { websiteDomain: true, affiliateApproved: true, affiliateProgramme: { where: { status: "ACTIVE" }, select: { id: true, linkTemplate: true } } } },
    },
  });
  if (!offer || !isAllowedDestination(offer.sourceUrl, offer.provider.websiteDomain)) return null;
  return {
    offerId: offer.id,
    providerId: offer.providerId,
    productVariantId: offer.productVariantId,
    destination: offer.sourceUrl,
    totalPricePence: deliveredTotalPence(offer),
    programme: offer.provider.affiliateApproved ? offer.provider.affiliateProgramme : null,
  };
}

export async function recordOutboundClick({ clickId, programmeId, target, placement, rankPosition, visitorHash, isLikelyBot, details, now }: {
  // Generated before the redirect so it can be sent to the affiliate network as the clickRef.
  clickId: string;
  programmeId: string | null;
  target: OutboundDestination;
  placement: ReferralPlacement | null;
  rankPosition: number | null;
  visitorHash: string | null;
  isLikelyBot: boolean;
  details: ClickDetails;
  now: Date;
}) {
  const recentFromVisitor = visitorHash
    ? await prisma.referralClick.count({ where: { visitorHash, createdAt: { gte: new Date(now.getTime() - HOUR_MS) } } })
    : 0;

  await prisma.referralClick.create({
    data: {
      id: clickId,
      programmeId,
      offerId: target.offerId,
      providerId: target.providerId,
      productVariantId: target.productVariantId,
      placement,
      rankPosition,
      visitorHash,
      isLikelyBot: isLikelyBot || recentFromVisitor >= BOT_CLICKS_PER_HOUR,
      ...details,
      totalPricePence: target.totalPricePence,
      createdAt: now,
    },
  });

  // The hash only exists to spot repeat-click bots within the hour; drop it once it's a day old.
  await prisma.referralClick.updateMany({
    where: { visitorHash: { not: null }, createdAt: { lt: new Date(now.getTime() - VISITOR_HASH_TTL_MS) } },
    data: { visitorHash: null },
  });
}
