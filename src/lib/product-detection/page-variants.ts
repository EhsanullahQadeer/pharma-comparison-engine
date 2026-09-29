import type { ProductVariant } from "@/generated/prisma/client";
import { collectPublicWebsite } from "@/lib/discovery/public-web";
import { pickPageVariantPrice } from "@/lib/price-collection/scrape-price";
import { isGenericFormulation, variantTokens } from "@/lib/price-collection/variant-label";

type CatalogueVariant = Pick<ProductVariant, "id" | "ingredient" | "brandName" | "strengthMg" | "packQuantity" | "formulation">;

// Which catalogue variants a detected product page actually offers: a page with strength/pack
// buttons or a price table sells many, so detection suggests one match per variant instead of one
// per page. Reads the page's own price data with the same exact-variant readers price collection
// uses (plain request only); a variant counts only when a price for exactly its strength, pack and
// branded/generic side is found. An unreadable page returns none — detection then falls back to a
// single undecided match for staff to assign by hand.
export async function findPricedVariantsOnPage(url: string, variants: CatalogueVariant[]): Promise<{ variantId: string; itemPricePence: number }[]> {
  let page;
  try {
    page = await collectPublicWebsite(url);
  } catch {
    return [];
  }
  return variants.flatMap((variant) => {
    const spec = { strengthMg: variant.strengthMg, packQuantity: variant.packQuantity, generic: isGenericFormulation(variant.formulation) };
    const price = pickPageVariantPrice(page.html, variantTokens(variant), spec, page.finalUrl);
    if (!price || !formulationMatches(variant.formulation, price.evidence)) return [];
    return [{ variantId: variant.id, itemPricePence: price.itemPricePence }];
  });
}

// The price readers check strength, pack and branded/generic but not tablet form, so a standard
// "Viagra 25mg / 4" price would otherwise also suggest the orodispersible 25mg × 4 variant. A
// melt-in-the-mouth variant is only suggested when the priced label itself says so.
function formulationMatches(formulation: string, evidence: string | undefined) {
  if (!/orodispersible/i.test(formulation)) return true;
  return /orodispersible|\bmelts?\b|\bodt\b/i.test(evidence ?? "");
}
