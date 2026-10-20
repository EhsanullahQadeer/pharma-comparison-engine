import type { Prisma } from "@/generated/prisma/client";
import { formatPence } from "@/lib/money";

type PolicyTerms = { standardFeePence: number; freeOverPence: number | null };
type DeliveryTerms = { deliveryFeePence: number; deliveryAssumption: string };
// Fees taken from a staff-approved policy count as verified, so the public total stops being
// "Indicative" and can rank ahead of unverified ones.
type VerifiedDeliveryTerms = DeliveryTerms & { feeVerifiedAt: Date };

export function deliveryFeeFor(policy: PolicyTerms, itemPricePence: number): number {
  return policy.freeOverPence !== null && itemPricePence >= policy.freeOverPence ? 0 : policy.standardFeePence;
}

export function describeDeliveryPolicy(policy: PolicyTerms): string {
  const standard = policy.standardFeePence === 0 ? "Free standard delivery" : `Standard delivery ${formatPence(policy.standardFeePence)}`;
  return policy.freeOverPence === null ? standard : `${standard}, free on orders of ${formatPence(policy.freeOverPence)} or more`;
}

function policyDelivery(policy: PolicyTerms, itemPricePence: number, now: Date): VerifiedDeliveryTerms {
  return {
    deliveryFeePence: deliveryFeeFor(policy, itemPricePence),
    deliveryAssumption: `${describeDeliveryPolicy(policy)} (the pharmacy's delivery policy, approved by staff)`,
    feeVerifiedAt: now,
  };
}

// The delivery terms to save with a freshly scraped price. A staff-approved policy always wins.
// Without one, an offer that already exists keeps the delivery fee it has — a scrape alone never
// changes it — and only a brand-new (still unpublished) offer starts from what the page showed.
// Without a policy no `feeVerifiedAt` is returned, so an offer's existing verification is untouched.
export async function resolveScrapedDelivery(tx: Prisma.TransactionClient, providerId: string, itemPricePence: number, scraped: DeliveryTerms, existing?: DeliveryTerms | null, now = new Date()): Promise<DeliveryTerms | VerifiedDeliveryTerms> {
  const policy = await tx.deliveryPolicy.findFirst({ where: { providerId, status: "APPROVED" }, select: { standardFeePence: true, freeOverPence: true } });
  if (policy) return policyDelivery(policy, itemPricePence, now);
  const kept = existing ?? scraped;
  return { deliveryFeePence: kept.deliveryFeePence, deliveryAssumption: kept.deliveryAssumption };
}

// Applies a newly approved policy to every offer the pharmacy has, marking their fees verified.
// Call inside the approving transaction; returns the offers whose delivery fee actually changed.
export async function applyDeliveryPolicyToOffers(tx: Prisma.TransactionClient, providerId: string, policy: PolicyTerms, now = new Date()): Promise<string[]> {
  const offers = await tx.offer.findMany({ where: { providerId }, select: { id: true, itemPricePence: true, deliveryFeePence: true } });
  const changed: string[] = [];
  for (const offer of offers) {
    const delivery = policyDelivery(policy, offer.itemPricePence, now);
    await tx.offer.update({ where: { id: offer.id }, data: delivery });
    if (delivery.deliveryFeePence !== offer.deliveryFeePence) changed.push(offer.id);
  }
  return changed;
}
