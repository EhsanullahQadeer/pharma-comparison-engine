import type { ProductVariant, SupplyClassification } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { isGenericFormulation } from "@/lib/price-collection/variant-label";
import { prisma } from "@/lib/prisma";
import type { OfferedOption } from "@/types/product-detection";

// Detection adds a strength/pack a pharmacy offers to the catalogue when it isn't there yet, so
// every option on a page can be matched; staff still confirm each match before a price is kept.

export type CatalogueVariant = Pick<ProductVariant, "id" | "ingredient" | "brandName" | "strengthMg" | "packQuantity" | "formulation">;

// Over-the-counter products are pharmacy (P) medicines; the rest are prescription-only.
const pharmacyMedicines = new Set(["viagra connect", "cialis together"]);

function sameProduct(variant: CatalogueVariant, option: OfferedOption) {
  return variant.ingredient === option.ingredient
    && (variant.brandName ?? "").toLowerCase() === option.brandName.toLowerCase()
    && variant.strengthMg === option.strengthMg
    && variant.packQuantity === option.packQuantity
    && isGenericFormulation(variant.formulation) === option.generic
    && /orodispersible/i.test(variant.formulation) === option.orodispersible;
}

// Written the way the existing catalogue names forms: "Film-coated tablet (generic, daily dose)".
// 5mg tadalafil is only sold as the daily dose.
function formulationFor(option: OfferedOption) {
  const notes = [option.generic ? "generic" : "", option.ingredient === "TADALAFIL" && option.strengthMg <= 5 ? "daily dose" : ""].filter(Boolean);
  const form = option.orodispersible ? "Orodispersible tablet" : "Film-coated tablet";
  return notes.length > 0 ? `${form} (${notes.join(", ")})` : form;
}

// `catalogue` is the caller's working copy; a created variant is added to it so later options
// (other pages of the same run) reuse it instead of creating a duplicate.
export async function ensureCatalogueVariant(option: OfferedOption, catalogue: CatalogueVariant[], actorId: string): Promise<{ variant: CatalogueVariant; created: boolean }> {
  const existing = catalogue.find((variant) => sameProduct(variant, option));
  if (existing) return { variant: existing, created: false };
  const supplyClassification: SupplyClassification = pharmacyMedicines.has(option.brandName.toLowerCase()) ? "P" : "POM";
  const data = { ingredient: option.ingredient, brandName: option.brandName, strengthMg: option.strengthMg, packQuantity: option.packQuantity, formulation: formulationFor(option), supplyClassification };
  const variant = await prisma.productVariant.create({ data, select: { id: true, ingredient: true, brandName: true, strengthMg: true, packQuantity: true, formulation: true } });
  await recordAuditLog({ actorId, action: "CREATE", entityType: "ProductVariant", entityId: variant.id, changes: { ...data, reason: "Offered on a pharmacy page found by product detection" } });
  catalogue.push(variant);
  return { variant, created: true };
}
