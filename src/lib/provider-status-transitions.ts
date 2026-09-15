import type { ProviderStatus, StaffRole } from "@/generated/prisma/client";

// M3b state machine (roadmap §4.2): discovered -> identity verified -> ED catalogue verified ->
// published -> temporarily withheld / archived. TEMPORARILY_WITHHELD is a reversible flag any
// catalogue editor can raise/clear (e.g. a listing needing a fix); ARCHIVED is administrator-only
// in both directions, since it's the closest thing to a takedown/reinstatement decision.
export const providerStatusTransitions: Record<ProviderStatus, ProviderStatus[]> = {
  DISCOVERED: ["IDENTITY_VERIFIED", "ARCHIVED"],
  IDENTITY_VERIFIED: ["ED_CATALOGUE_VERIFIED", "ARCHIVED"],
  ED_CATALOGUE_VERIFIED: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["TEMPORARILY_WITHHELD", "ARCHIVED"],
  TEMPORARILY_WITHHELD: ["PUBLISHED", "ARCHIVED"],
  ARCHIVED: ["DISCOVERED"],
};

const administratorOnlyStatuses: ProviderStatus[] = ["ARCHIVED"];

export function getAllowedNextStatuses(current: ProviderStatus, role: StaffRole): ProviderStatus[] {
  const next = providerStatusTransitions[current];
  if (role === "ADMINISTRATOR") return next;
  if (current === "ARCHIVED") return [];
  return next.filter((status) => !administratorOnlyStatuses.includes(status));
}
