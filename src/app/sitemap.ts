import { getPublishedArticleSitemapEntries } from "@/actions/articles/articles";
import { publicRoutes } from "@/lib/ed-pages";
import { siteUrl } from "@/lib/site-url";

import type { MetadataRoute } from "next";

// Built from the page catalogue plus genuinely published articles, so crawlers only receive URLs
// that are both publicly readable and allowed to be indexed. Pharmacy and prescription-price
// pages stay out until their separate legal noindex gate is lifted.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!siteUrl) return [];
  const articles = await getPublishedArticleSitemapEntries();
  const staticEntries = publicRoutes
    .filter((route) => route.indexable)
    .map((route) => ({ url: new URL(route.href, siteUrl).href, changeFrequency: "monthly" as const, priority: route.href === "/" ? 1 : 0.7 }));
  const articleEntries = articles.map((article) => ({
    url: new URL(`/ed/${article.slug}`, siteUrl).href,
    lastModified: article.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));
  return [...staticEntries, ...articleEntries];
}
