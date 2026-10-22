import { cache } from "react";

import { auth } from "@/auth";
import { partnerSelect, partnerSessionId, toPartnerUserSession } from "@/lib/partner-session";
import { prisma } from "@/lib/prisma";
import type { PartnerUserSession } from "@/types/auth";

export class PartnerUnauthorizedError extends Error {}

// The one authoritative "is this a pharmacy portal user?" check for the /partner area and every
// partner action. Like getStaffUser: a partner-kind session alone isn't enough — the account is
// re-read, so deactivation and the end of a partnership's 90-day window apply at once.
export const getPartnerUser = cache(async (): Promise<PartnerUserSession | null> => {
  const id = partnerSessionId((await auth())?.user);
  if (!id) return null;
  const partner = await prisma.partnerUser.findUnique({ where: { id }, select: partnerSelect });
  return toPartnerUserSession(partner, new Date());
});

// Every partner action starts here; its queries use the returned providerId, never one passed in.
export async function requirePartner() {
  const partner = await getPartnerUser();
  if (!partner) throw new PartnerUnauthorizedError("Not signed in to the pharmacy portal.");
  return partner;
}
