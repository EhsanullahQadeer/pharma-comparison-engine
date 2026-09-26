import { publicRoutes } from "@/lib/ed-pages";
import { siteUrl } from "@/lib/site-url";

import type { MetadataRoute } from "next";

// Built from the page catalogue's own indexable flags, so the sitemap can't drift from what's live.
// Pharmacy profiles are left out while POM pricing pages are noindex (src/lib/seo.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteUrl) return [];
  return publicRoutes.filter((route) => route.indexable).map((route) => ({ url: new URL(route.href, siteUrl).href }));
}
