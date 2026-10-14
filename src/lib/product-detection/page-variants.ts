import type { Ingredient } from "@/generated/prisma/client";
import { collectPublicWebsite } from "@/lib/discovery/public-web";
import { FINAL_REFUSAL } from "@/lib/discovery/public-web-policy";
import { pickPageVariantPrice } from "@/lib/price-collection/scrape-price";
import { variantTokens } from "@/lib/price-collection/variant-label";
import { isEdCategoryPagePath } from "@/lib/product-detection/ed-tokens";
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

// A page whose content its scripts build or fill in after loading: an empty shell (Online Pharmacy
// 4U: `<div id="root"></div>` and nothing else) or a Next.js page that fetches its prices once open
// (Medy's ED page) — those prices exist only once a browser has rendered it.
const SCRIPT_BUILT_PAGE = /<div\b[^>]*\bid\s*=\s*"(?:root|app|__next|__nuxt)"[^>]*>\s*<\/div>|\/_next\/static\//i;

export const ingredientWords: Record<Ingredient, string> = { SILDENAFIL: "sildenafil", TADALAFIL: "tadalafil" };

// The medicines a detected page is checked for: the one it was matched on, or both on an ED
// condition page, which may sell every treatment itself (Medy's /erectile-dysfunction lists Viagra,
// sildenafil, Cialis and tadalafil but was matched on its sildenafil title alone).
export function pageIngredients(url: string, ingredient: Ingredient): Ingredient[] {
  return isEdCategoryPagePath(new URL(url).pathname) ? (Object.keys(ingredientWords) as Ingredient[]) : [ingredient];
}

// `blocked` when the plain request couldn't read the page for a reason a browser can get past (a
// security check, a 403, or prices its scripts only add once it is open) — the caller then reads it
// in the Chrome window. A robots refusal or a non-public address is final and never blocked.
export async function findOfferedOptionsOnPage(url: string, ingredients: Ingredient[]): Promise<{ options: OfferedOption[]; blocked: boolean }> {
  try {
    const page = await collectPublicWebsite(url);
    const options = offeredOptionsInHtml(page.html, page.finalUrl, ingredients);
    return { options, blocked: options.length === 0 && SCRIPT_BUILT_PAGE.test(page.html) };
  } catch (error) {
    return { options: [], blocked: !(error instanceof Error && FINAL_REFUSAL.test(error.message)) };
  }
}

// The same read on a page already in hand — its HTML as loaded in the Chrome window, for sites a
// plain request can't reach (a security check in front of every page, e.g. Oxford Online Pharmacy).
export function offeredOptionsInHtml(html: string, finalUrl: string, ingredients: Ingredient[]): OfferedOption[] {
  const options: OfferedOption[] = [];
  for (const [ingredient, product] of ingredients.flatMap((ingredient) => productsByIngredient[ingredient].map((item) => [ingredient, item] as const))) {
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
