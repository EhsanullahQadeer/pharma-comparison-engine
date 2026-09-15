import type { StaffRole } from "@/generated/prisma/client";

export const staffRoleLabels: Record<StaffRole, string> = {
  CATALOGUE_EDITOR: "Catalogue editor",
  CONTENT_REVIEWER: "Content reviewer",
  ADMINISTRATOR: "Administrator",
  COMMERCIAL_MANAGER: "Commercial manager",
};
