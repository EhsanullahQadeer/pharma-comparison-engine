import type { Ingredient } from "@/generated/prisma/client";
import { collectPublicWebsite } from "@/lib/discovery/public-web";
import { pickPageVariantPrice } from "@/lib/price-collection/scrape-price";
import { variantTokens } from "@/lib/price-collection/variant-label";
import type { OfferedOption } from "@/types/product-detection";

// Every strength/pack option a detected product page offers — its strength and pack-size buttons,
// dropdowns or price table — found by asking the same exact-variant readers price collection uses
// about each realistic combination of product, branded/generic side, strength and pack. An option
// counts only when a price for exactly that combination is on the page, so this never guesses; it
// just doesn't depend on the combination already being in the catalogue. Plain request only; an
// unreadable page offers none (detection then leaves one undecided match for staff).

// The products compared per ingredient, with the strengths each is sold in. Strengths are whole
// milligrams (the catalogue stores them as integers), so 2.5mg daily tadalafil isn't probed.
const productsByIngredient: Record<Ingredient, { brandName: string; generic: boolean; strengths: number[] }[]> = {
  SILDENAFIL: [
    { brandName: "Viagra", generic: false, strengths: [25, 50, 100] },
    { brandName: "Viagra", generic: true, strengths: [25, 50, 100] },
    { brandName: "Viagra Connect", generic: false, strengths: [50] },
  ],
  TADALAFIL: [
    { brandName: "Cialis", generic: false, strengths: [5, 10, 20] },
    { brandName: "Cialis", generic: true, strengths: [5, 10, 20] },
    { brandName: "Cialis Together", generic: false, strengths: [10] },
  ],
};

const PACK_SIZES = [1, 2, 3, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 30, 32, 36, 40, 48, 56, 60, 64, 72, 84, 90, 96];

export async function findOfferedOptionsOnPage(url: string, ingredient: Ingredient): Promise<OfferedOption[]> {
  let page;
  try {
    page = await collectPublicWebsite(url);
  } catch {
    return [];
  }
  const options: OfferedOption[] = [];
  for (const product of productsByIngredient[ingredient]) {
    const tokens = variantTokens({ ingredient, brandName: product.brandName });
    for (const strengthMg of product.strengths) {
      for (const packQuantity of PACK_SIZES) {
        const price = pickPageVariantPrice(page.html, tokens, { strengthMg, packQuantity, generic: product.generic }, page.finalUrl);
        if (!price) continue;
        options.push({
          ingredient,
          brandName: product.brandName,
          generic: product.generic,
          strengthMg,
          packQuantity,
          // The readers don't check tablet form, so melt-in-the-mouth only when the label says so.
          orodispersible: /orodispersible|\bmelts?\b|\bodt\b/i.test(price.evidence ?? ""),
          itemPricePence: price.itemPricePence,
        });
      }
    }
  }
  return options;
}
