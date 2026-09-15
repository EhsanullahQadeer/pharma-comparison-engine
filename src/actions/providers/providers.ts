"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/staff-auth";
import { RegulatorType } from "@/generated/prisma/client";

const createProviderSchema = z.object({
  legalName: z.string().trim().min(2, "Enter the registered legal name."),
  tradingName: z.string().trim().min(2, "Enter the trading name."),
  websiteDomain: z
    .string()
    .trim()
    .min(3, "Enter the website domain.")
    .transform((value) => value.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "")),
  regulatorType: z.enum(RegulatorType),
  regulatorReference: z.string().trim().min(3, "Enter the regulator registration reference."),
  dispensingPartnerName: z.string().trim().optional(),
  serviceRegions: z.string().trim().min(1, "List at least one service region."),
});

export type CreateProviderState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof createProviderSchema>, string[]>>;
};

// Staff-facing manual entry — new providers always land as DISCOVERED (M3b state machine); staff
// promote them through identity/catalogue verification separately, never auto-published.
export async function createProvider(_prevState: CreateProviderState, formData: FormData): Promise<CreateProviderState> {
  try {
    await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to add providers." };
  }

  const parsed = createProviderSchema.safeParse({
    legalName: formData.get("legalName"),
    tradingName: formData.get("tradingName"),
    websiteDomain: formData.get("websiteDomain"),
    regulatorType: formData.get("regulatorType"),
    regulatorReference: formData.get("regulatorReference"),
    dispensingPartnerName: formData.get("dispensingPartnerName") || undefined,
    serviceRegions: formData.get("serviceRegions"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { serviceRegions, ...rest } = parsed.data;

  try {
    await prisma.provider.create({
      data: {
        ...rest,
        serviceRegions: serviceRegions
          .split(",")
          .map((region) => region.trim())
          .filter(Boolean),
      },
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      return { error: "A provider with this website domain already exists." };
    }
    throw error;
  }

  revalidatePath("/admin/pharmacies");
  redirect("/admin/pharmacies");
}

export async function getProviders(search?: string, take?: number) {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);
  const query = search?.trim();
  return prisma.provider.findMany({
    where: query
      ? {
          OR: [
            { tradingName: { contains: query, mode: "insensitive" } },
            { legalName: { contains: query, mode: "insensitive" } },
            { websiteDomain: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      tradingName: true,
      legalName: true,
      websiteDomain: true,
      regulatorType: true,
      status: true,
      serviceRegions: true,
      createdAt: true,
    },
  });
}

export async function getProviderStatusCounts() {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);
  const grouped = await prisma.provider.groupBy({ by: ["status"], _count: { _all: true } });
  return grouped.map((entry) => ({ status: entry.status, count: entry._count._all }));
}
