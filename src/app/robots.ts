import { siteUrl } from "@/lib/site-url";

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // Allow crawlers to read coming-soon pages' noindex tags; keep the staff dashboard out entirely.
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }, ...(siteUrl ? { sitemap: new URL("/sitemap.xml", siteUrl).href } : {}) };
}
