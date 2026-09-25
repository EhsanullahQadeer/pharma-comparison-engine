"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Ingredient, Prisma, SupplyClassification } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { HumanVerificationError } from "@/lib/price-collection/human-browser";
import { runVariantScrape } from "@/lib/price-collection/run-variant-scrape";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/staff-auth";

const productVariantSchema = z.object({
  ingredient: z.enum(Ingredient),
  brandName: z.string().trim().optional(),
  strengthMg: z.coerce.number().int().min(1, "Enter the strength in mg."),
  formulation: z.string().trim().min(2, "Describe the formulation (e.g. \"Film-coated tablet\")."),
  packQuantity: z.coerce.number().int().min(1, "Enter the pack quantity."),
  supplyClassification: z.enum(SupplyClassification),
});

export type ProductVariantState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof productVariantSchema>, string[]>>;
};

function parseProductVariantFormData(formData: FormData) {
  return productVariantSchema.safeParse({
    ingredient: formData.get("ingredient"),
    brandName: formData.get("brandName") || undefined,
    strengthMg: formData.get("strengthMg"),
    formulation: formData.get("formulation"),
    packQuantity: formData.get("packQuantity"),
    supplyClassification: formData.get("supplyClassification"),
  });
}

export async function createProductVariant(_prevState: ProductVariantState, formData: FormData): Promise<ProductVariantState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to add product variants." };
  }

  const parsed = parseProductVariantFormData(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const variant = await prisma.productVariant.create({ data: parsed.data });
  await recordAuditLog({ actorId: staffUser.id, action: "CREATE", entityType: "ProductVariant", entityId: variant.id, changes: parsed.data });

  revalidatePath("/admin/catalogue/product-variants");
  return {};
}

export async function updateProductVariant(id: string, _prevState: ProductVariantState, formData: FormData): Promise<ProductVariantState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to edit product variants." };
  }

  const parsed = parseProductVariantFormData(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const variant = await prisma.productVariant.update({ where: { id }, data: parsed.data });
  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "ProductVariant", entityId: variant.id, changes: parsed.data });

  revalidatePath("/admin/catalogue/product-variants");
  return {};
}

export type DeleteProductVariantState = { error?: string };

export async function deleteProductVariant(id: string): Promise<DeleteProductVariantState> {
  const staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);

  const offerCount = await prisma.offer.count({ where: { productVariantId: id } });
  if (offerCount > 0) {
    return { error: `Cannot delete — ${offerCount} offer${offerCount === 1 ? "" : "s"} still reference this variant.` };
  }

  await prisma.productVariant.delete({ where: { id } });
  await recordAuditLog({ actorId: staffUser.id, action: "DELETE", entityType: "ProductVariant", entityId: id, changes: {} });

  revalidatePath("/admin/catalogue/product-variants");
  return {};
}

export async function getProductVariants(search?: string, page = 1, pageSize: number = DEFAULT_PAGE_SIZE) {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);
  const query = search?.trim();
  const where = query
    ? { OR: [{ brandName: { contains: query, mode: "insensitive" as const } }, { formulation: { contains: query, mode: "insensitive" as const } }] }
    : undefined;

  const [variants, total] = await Promise.all([
    prisma.productVariant.findMany({
      where,
      orderBy: [{ ingredient: "asc" }, { strengthMg: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.productVariant.count({ where }),
  ]);

  return { variants, total, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

// Unpaginated list for use in <select> pickers (offer forms) — catalogue size is small (roadmap
// scope is sildenafil/tadalafil variants only), so a full list is fine here.
export async function getAllProductVariants() {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);
  return prisma.productVariant.findMany({ orderBy: [{ ingredient: "asc" }, { strengthMg: "asc" }] });
}

export type ScrapeVariantPricesState = {
  error?: string;
  result?: { attempted: number; scraped: number; failed: number };
};

// The scrape loop itself lives in lib/price-collection/run-variant-scrape.ts (shared with the SSE
// progress route at app/api/product-variants/[id]/scrape-stream) — this just does auth, calls it
// with a no-op progress reporter, and translates the result into this action's return shape.
export async function scrapePricesForVariant(productVariantId: string): Promise<ScrapeVariantPricesState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to scrape variant prices." };
  }

  try {
    const result = await runVariantScrape(productVariantId, staffUser.id);
    revalidatePath("/admin/catalogue/product-variants");
    revalidatePath(`/admin/catalogue/product-variants/${productVariantId}/prices`);
    return { result };
  } catch (error) {
    if (error instanceof HumanVerificationError) return { error: error.message };
    if (error instanceof Error && error.message === "Product variant not found.") return { error: error.message };
    throw error;
  }
}

export async function getProductVariantPricePage(productVariantId: string) {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);
  const variant = await prisma.productVariant.findUnique({
    where: { id: productVariantId },
    include: {
      offers: {
        orderBy: { updatedAt: "desc" },
        include: {
          provider: { select: { id: true, tradingName: true, websiteDomain: true, status: true } },
          priceHistory: { orderBy: { recordedAt: "desc" } },
          productMatch: {
            select: {
              id: true,
              candidateUrl: true,
            },
          },
        },
      },
      productMatches: {
        where: { status: "CONFIRMED", offerId: null },
        include: { provider: { select: { id: true, tradingName: true, websiteDomain: true } } },
        orderBy: { reviewedAt: "desc" },
      },
    },
  });
  if (!variant) throw new Error("Product variant not found.");
  const matchIds = variant.offers.flatMap((offer) => offer.productMatch?.id ? [offer.productMatch.id] : []);
  const scrapeRows = matchIds.length > 0
    ? await prisma.$queryRaw<Array<{
      id: string;
      lastScrapeStatus: string | null;
      lastScrapeError: string | null;
      lastScrapedAt: Date | null;
      requiresHumanAssist: boolean;
    }>>(Prisma.sql`
      SELECT id, "lastScrapeStatus", "lastScrapeError", "lastScrapedAt", "requiresHumanAssist"
      FROM "ProductMatch"
      WHERE id IN (${Prisma.join(matchIds)})
    `)
    : [];
  const scrapeByMatchId = new Map(scrapeRows.map((row) => [row.id, row]));
  return {
    ...variant,
    offers: variant.offers.map((offer) => ({
      ...offer,
      productMatch: offer.productMatch ? { ...offer.productMatch, ...scrapeByMatchId.get(offer.productMatch.id) } : null,
    })),
  };
}
