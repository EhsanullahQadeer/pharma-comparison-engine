import type { Ingredient } from "@/generated/prisma/client";

// Matches docs/implementation-plan.md §6's "match tokens against URL slugs only, never body text"
// rule (feed titles and link text are the named exceptions below). Order doesn't matter for correctness (all matched tokens are collected), just readability.
const edIngredientTokens: [string, Ingredient][] = [
  ["sildenafil", "SILDENAFIL"],
  ["viagra", "SILDENAFIL"],
  ["tadalafil", "TADALAFIL"],
  ["cialis", "TADALAFIL"],
];

// Any ED token as a whole word — for scanning text shown in a browser page.
export const edTokenPattern = new RegExp(`\\b(?:${edIngredientTokens.map(([token]) => token).join("|")})\\b`, "i");

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
// false-positive as a product page. Editorial hubs that nest articles under a condition folder
// (Simple Online Pharmacy's /health-advice/erectile-dysfunction/viagra/how-does-viagra-work/) too.
const blockedPathSegments = new Set(["blog", "blogs", "news", "guide", "guides", "article", "articles", "faq", "faqs", "help", "advice", "health-advice", "health-hub", "health-centre", "health-center", "health-guides", "health-information", "learn", "resources", "info"]);

// The subset of allowedPathSegments that names the condition itself rather than a generic
// e-commerce word — used as the single-segment root a page must sit at for edPageMentionsIngredient
// below to be a safe fallback (see that function's comment for why "products"/"treatments" alone
// aren't included here).
export const edCategoryRootSegments = new Set(["erectile-dysfunction", "erectile-dysfunction-ed", "ed"]);

// A single-segment ED condition page ("/erectile-dysfunction") — where combined storefronts list
// every drug on one page.
export function isEdCategoryRootPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean).map((segment) => segment.toLowerCase());
  return segments.length === 1 && edCategoryRootSegments.has(segments[0]);
}

// An ED condition/treatment listing page by its address alone, optionally under a UK locale
// folder and with a file extension: "/erectile-dysfunction", "/uk/erectile-dysfunction-treatment.html".
// Consultation, trial-pack or article pages ("-consultation", "-causes") don't count.
const edCategoryPageWords = new Set(["treatment", "treatments", "medication", "medications", "medicine", "medicines", "pills", "tablets", "online", "uk"]);

export function isEdCategoryPagePath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean).map((segment) => segment.toLowerCase());
  const last = segments[segments.length - 1]?.replace(/\.(?:html?|php|aspx?)$/, "") ?? "";
  if (!last || !segments.slice(0, -1).every((segment) => ukLocaleSegments.has(segment))) return false;
  if (edCategoryRootSegments.has(last)) return true;
  const rest = last.replace(/^erectile-dysfunction(?:-ed)?/, "");
  return rest !== last && rest.split("-").filter(Boolean).every((word) => edCategoryPageWords.has(word));
}

export type EdPathMatch = {
  ingredient: Ingredient;
  matchedTokens: string[];
  confidence: "HIGH" | "MEDIUM";
};

// "Viagra-Connect" -> "viagraconnect", so hyphen/case variations still match the plain token.
function normalizeSegment(segment: string): string {
  return segment.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Flat product pages with no section folder (e.g. Zava's /uk/viagra.html, /uk/cialis-daily.html):
// the last segment must be nothing but ED tokens plus product words, so "viagra-side-effects",
// "viagra-dosage" or "viagra-alternatives" never pass; anything before it may only be a UK locale
// folder, so other countries' pages (/fr/viagra.html) are skipped.
const flatProductWords = new Set(["tablet", "tablets", "tabs", "pill", "pills", "connect", "together", "daily", "generic", "branded", "film", "coated", "online", "buy", "uk", "pack", "packs", "subscription"]);
const ukLocaleSegments = new Set(["uk", "gb", "en", "en-gb", "en_gb"]);

function isFlatProductPath(lowerSegments: string[]): boolean {
  const last = lowerSegments[lowerSegments.length - 1]?.replace(/\.(?:html?|php|aspx?)$/, "");
  if (!last || !lowerSegments.slice(0, -1).every((segment) => ukLocaleSegments.has(segment))) return false;
  const words = last.split(/[-_]+/).filter(Boolean);
  const tokens = new Set(edIngredientTokens.map(([token]) => token));
  // Numbers are strengths ("100mg") or pack counts ("8" in Well's "sildenafil-100mg-8-pack-subscription").
  return words.some((word) => tokens.has(word)) && words.every((word) => tokens.has(word) || flatProductWords.has(word) || /^\d+(?:\.\d+)?(?:mg)?$/.test(word));
}

// HIGH confidence when the token sits in the URL's final path segment (a specific product page,
// e.g. /treatments/viagra-connect); MEDIUM when it only appears in an earlier segment (a bare
// category/collection page, e.g. /treatments/erectile-dysfunction).
export function matchEdProductPath(pathname: string): EdPathMatch | undefined {
  const segments = pathname.split("/").filter(Boolean);
  const lowerSegments = segments.map((segment) => segment.toLowerCase());
  if (lowerSegments.some((segment) => blockedPathSegments.has(segment))) return undefined;
  if (!lowerSegments.some((segment) => allowedPathSegments.has(segment)) && !isFlatProductPath(lowerSegments)) return undefined;

  // A token counts only at the start of a word ("viagra-connect", "viagraconnect", "sildenafil100mg"),
  // never buried inside one: "specialist-skincare" (Well) contains "cialis".
  const segmentWords = lowerSegments.map((segment) => segment.split(/[^a-z0-9]+/).filter(Boolean));
  const lastWords = segmentWords[segmentWords.length - 1] ?? [];
  const hasToken = (words: string[], token: string) => words.some((word) => word.startsWith(token));

  const matchedTokens: string[] = [];
  let ingredient: Ingredient | undefined;
  let inLastSegment = false;

  for (const [token, tokenIngredient] of edIngredientTokens) {
    if (!segmentWords.some((words) => hasToken(words, token))) continue;
    matchedTokens.push(token);
    ingredient ??= tokenIngredient;
    if (hasToken(lastWords, token)) inLastSegment = true;
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

const informationSlugWords = new Set(["side", "effects", "dosage", "dose", "doses", "alternatives", "alternative", "vs", "versus", "comparison", "compare", "doesnt", "reviews", "review", "causes", "symptoms", "interactions", "warnings", "leaflet"]);

// The product name a site shows on a link (its anchor text) names what the linked page sells, so
// it's exempt from the body-text ban like a feed title — catching opaque slugs such as
// "/products/hezkue" linked as "Hezkue (Sildenafil)". Weaker than a feed title (a menu link
// "Viagra vs Cialis" can lead to a comparison page), so MEDIUM; never for the homepage, a
// blog/guide path, or a long block of card copy rather than a name.
export function matchEdProductLinkText(text: string, pathname: string): EdPathMatch | undefined {
  const segments = pathname.split("/").filter(Boolean).map((segment) => segment.toLowerCase());
  if (segments.length === 0 || segments.some((segment) => blockedPathSegments.has(segment))) return undefined;
  // Information pages a condition page links with the drug's name ("Viagra side effects" →
  // /uk/viagra-side-effects.html) aren't product pages.
  if (segments[segments.length - 1].split(/[-_.]+/).some((word) => informationSlugWords.has(word))) return undefined;
  const name = text.replace(/\s+/g, " ").trim();
  if (!name || name.length > 200) return undefined;
  const match = matchEdProductTitle(name);
  return match && { ...match, confidence: "MEDIUM" };
}
