import { publicRoutes } from "@/lib/ed-pages";
import { siteUrl } from "@/lib/site-url";

import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteUrl) return [];
  return publicRoutes.filter((route) => route.indexable).map((route) => ({ url: new URL(route.href, siteUrl).href }));
}
