import type { StaffRole } from "@/generated/prisma/client";

// A verified staff member for this request: taken from a staff session and re-read from the
// database, so deactivation and role changes apply immediately.
// A signed-in pharmacy portal user for this request, re-read from the database like staff. Every
// partner query is scoped to `providerId` from here, never from a URL or form value.
// `accessEndsAt`: null while the pharmacy is a partner; the end of its 90-day read-only window after.
export type PartnerUserSession = {
  kind: "partner";
  id: string;
  name: string;
  email: string;
  providerId: string;
  providerName: string;
  accessEndsAt: Date | null;
};

export type StaffUserSession = {
  kind: "staff";
  id: string;
  role: StaffRole;
  name: string;
  email: string;
};
