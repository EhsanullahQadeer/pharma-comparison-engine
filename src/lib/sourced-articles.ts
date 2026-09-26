import { guideArticles } from "@/lib/guide-articles";
import { sideEffectsArticles } from "@/lib/side-effects-articles";
import { toolArticles } from "@/lib/tool-articles";

// Source-checked content for every article page (guides, treatments, side effects, tools). The public
// page shows it, labelled "awaiting review by a named clinician", until a clinically reviewed Article
// for the same slug is PUBLISHED, which then takes over. The same content seeds the DRAFT articles
// (scripts/seed-article-drafts.ts) that staff edit and send for review.
export const SOURCES_CHECKED_ON = new Date("2026-09-26");

export const sourcedArticles = [...guideArticles, ...sideEffectsArticles, ...toolArticles];

export function getSourcedArticle(slug: string) {
  return sourcedArticles.find((article) => article.slug === slug) ?? null;
}
