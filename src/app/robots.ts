import { siteUrl } from "@/lib/site-url";

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // Allow crawlers to read noindex pages' tags; keep the staff dashboard out entirely.
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/go/"] }, ...(siteUrl ? { sitemap: new URL("/sitemap.xml", siteUrl).href } : {}) };
}
