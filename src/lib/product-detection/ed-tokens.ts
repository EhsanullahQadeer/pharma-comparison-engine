import type { Ingredient } from "@/generated/prisma/client";

// Matches docs/implementation-plan.md §6's "match tokens against URL slugs only, never body text"
// rule. Order doesn't matter for correctness (all matched tokens are collected), just readability.
const edIngredientTokens: [string, Ingredient][] = [
  ["sildenafil", "SILDENAFIL"],
  ["viagra", "SILDENAFIL"],
  ["tadalafil", "TADALAFIL"],
  ["cialis", "TADALAFIL"],
];

// A token only counts on a path that looks like an actual product/treatment listing — never a
// blog/guide/news path, per the same rule (avoids "viagra" matching an unrelated blog post).
// Verified live against real UK pharmacy sites (treated.com, clickpharmacy.co.uk): the common real
// pattern is a condition-name root ("erectile-dysfunction") with the drug as the next segment, not
// generic e-commerce words alone — both are kept since either is a legitimate site structure.
const allowedPathSegments = new Set([
  "product", "products", "treatment", "treatments", "shop", "collections",
  "online-doctor", "consultation", "medicine", "medicines", "medication", "medications",
  "erectile-dysfunction", "erectile-dysfunction-ed", "ed",
]);

// Excluded outright even under an allowed root — e.g. clickpharmacy.co.uk genuinely nests blog
// posts under /erectile-dysfunction/blog/..., where a title like "...viagra-last" would otherwise
// false-positive as a product page.
const blockedPathSegments = new Set(["blog", "blogs", "news", "guide", "guides", "article", "articles", "faq", "faqs", "help", "advice"]);

// The subset of allowedPathSegments that names the condition itself rather than a generic
// e-commerce word — used as the single-segment root a page must sit at for edPageMentionsIngredient
// below to be a safe fallback (see that function's comment for why "products"/"treatments" alone
// aren't included here).
export const edCategoryRootSegments = new Set(["erectile-dysfunction", "erectile-dysfunction-ed", "ed"]);

export type EdPathMatch = {
  ingredient: Ingredient;
  matchedTokens: string[];
  confidence: "HIGH" | "MEDIUM";
};

// "Viagra-Connect" -> "viagraconnect", so hyphen/case variations still match the plain token.
function normalizeSegment(segment: string): string {
  return segment.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// HIGH confidence when the token sits in the URL's final path segment (a specific product page,
// e.g. /treatments/viagra-connect); MEDIUM when it only appears in an earlier segment (a bare
// category/collection page, e.g. /treatments/erectile-dysfunction).
export function matchEdProductPath(pathname: string): EdPathMatch | undefined {
  const segments = pathname.split("/").filter(Boolean);
  const lowerSegments = segments.map((segment) => segment.toLowerCase());
  if (lowerSegments.some((segment) => blockedPathSegments.has(segment))) return undefined;
  if (!lowerSegments.some((segment) => allowedPathSegments.has(segment))) return undefined;

  const normalizedSegments = segments.map(normalizeSegment);
  const lastSegment = normalizedSegments[normalizedSegments.length - 1] ?? "";

  const matchedTokens: string[] = [];
  let ingredient: Ingredient | undefined;
  let inLastSegment = false;

  for (const [token, tokenIngredient] of edIngredientTokens) {
    const normalizedToken = normalizeSegment(token);
    if (!normalizedSegments.some((segment) => segment.includes(normalizedToken))) continue;
    matchedTokens.push(token);
    ingredient ??= tokenIngredient;
    if (lastSegment.includes(normalizedToken)) inLastSegment = true;
  }

  if (!ingredient) return undefined;
  return { ingredient, matchedTokens, confidence: inLastSegment ? "HIGH" : "MEDIUM" };
}

// Resolves a free-text drug name (e.g. "viagra", "Sildenafil") to its Ingredient, for callers that
// take a drug name as input rather than scanning a URL — same token list as matchEdProductPath.
export function resolveIngredientFromTerm(term: string): Ingredient | undefined {
  const normalized = normalizeSegment(term);
  return edIngredientTokens.find(([token]) => normalizeSegment(token) === normalized)?.[1];
}

// Some sites (e.g. Next.js/SPA storefronts) list every drug on one combined condition page
// ("/erectile-dysfunction") instead of a dedicated URL per drug, so matchEdProductPath's URL-only
// rule never surfaces them — there's no per-drug slug to match against. This checks page HTML for
// the requested ingredient's own token as a targeted fallback, safe specifically because the caller
// already knows (a) the page sits at a genuine ED-condition root (edCategoryRootSegments), not any
// arbitrary URL, and (b) it's checking for one specific, user-requested drug rather than scanning
// for any mention of any drug — the false-positive risk the body-text ban in matchEdProductPath
// guards against (an unrelated blog mentioning "viagra") doesn't apply the same way here.
export function edPageMentionsIngredient(html: string, ingredient: Ingredient): boolean {
  return edIngredientTokens.some(([token, tokenIngredient]) => tokenIngredient === ingredient && new RegExp(`\\b${token}\\b`, "i").test(html));
}

// A structured product-feed item's own declared title (a sitemap/RSS/Atom/Google-Shopping-style
// feed's <title>/<g:title> — see site-feeds.ts) is fundamentally different evidence from arbitrary
// page body text: it's the site's own e-commerce/catalog system explicitly naming what a URL sells,
// not an incidental mention (e.g. a blog post title using the word in passing), so it's exempt from
// matchEdProductPath's body-text ban the same way edPageMentionsIngredient's category-page fallback
// is. Always HIGH confidence for the same reason. Catches products behind an opaque URL slug (e.g.
// "/products/hezkue") that matchEdProductPath's URL-only rule can never resolve on its own.
export function matchEdProductTitle(title: string): EdPathMatch | undefined {
  const matchedTokens: string[] = [];
  let ingredient: Ingredient | undefined;
  for (const [token, tokenIngredient] of edIngredientTokens) {
    if (!new RegExp(`\\b${token}\\b`, "i").test(title)) continue;
    matchedTokens.push(token);
    ingredient ??= tokenIngredient;
  }
  if (!ingredient) return undefined;
  return { ingredient, matchedTokens, confidence: "HIGH" };
}
