import type { Ingredient } from "@/generated/prisma/client";
import { collectPublicWebsite } from "@/lib/discovery/public-web";
import { FINAL_REFUSAL } from "@/lib/discovery/public-web-policy";
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

// `blocked` when the plain request couldn't reach the page for a reason a browser can get past (a
// security check, a 403) — the caller then reads it in the Chrome window. A robots refusal or a
// non-public address is final and never blocked.
export async function findOfferedOptionsOnPage(url: string, ingredient: Ingredient): Promise<{ options: OfferedOption[]; blocked: boolean }> {
  try {
    const page = await collectPublicWebsite(url);
    return { options: offeredOptionsInHtml(page.html, page.finalUrl, ingredient), blocked: false };
  } catch (error) {
    return { options: [], blocked: !(error instanceof Error && FINAL_REFUSAL.test(error.message)) };
  }
}

// The same read on a page already in hand — its HTML as loaded in the Chrome window, for sites a
// plain request can't reach (a security check in front of every page, e.g. Oxford Online Pharmacy).
export function offeredOptionsInHtml(html: string, finalUrl: string, ingredient: Ingredient): OfferedOption[] {
  const options: OfferedOption[] = [];
  for (const product of productsByIngredient[ingredient]) {
    const tokens = variantTokens({ ingredient, brandName: product.brandName });
    for (const strengthMg of product.strengths) {
      for (const packQuantity of PACK_SIZES) {
        const price = pickPageVariantPrice(html, tokens, { strengthMg, packQuantity, generic: product.generic }, finalUrl);
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

const ingredientWords: Record<Ingredient, string> = { SILDENAFIL: "sildenafil", TADALAFIL: "tadalafil" };
const otcProductSlugs = ["viagra-connect", "cialis-together"];

// How well a page's address fits an option's product, for choosing one page when several list the
// same option (a product's own page plus comparison tables on its siblings' pages): 2 when the
// address names that product, 0 when it names an over-the-counter product the option isn't, else 1.
export function pageAffinity(url: string, option: Pick<OfferedOption, "ingredient" | "brandName" | "generic">): number {
  const path = new URL(url).pathname.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const brandSlug = option.brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (otcProductSlugs.includes(brandSlug)) return path.includes(brandSlug) ? 2 : 1;
  if (otcProductSlugs.some((slug) => path.includes(slug))) return 0;
  return path.includes(option.generic ? ingredientWords[option.ingredient] : brandSlug) ? 2 : 1;
}
