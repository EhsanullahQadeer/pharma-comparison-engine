import Link from "@/components/Link";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "ED page not found", description: "This page doesn't exist. Browse every page on the ED price comparison site.", robots: { index: false } };

export default function NotFound() {
  return <div className="mx-auto max-w-6xl px-6 py-24"><p className="text-sm text-muted-foreground">404</p><h1 className="mt-4 text-4xl font-semibold">This page could not be found</h1><p className="mt-4 text-muted-foreground">It may have moved. Use the menu, or browse every page on the site.</p><Link href="/ed/site-map" className="mt-6 inline-block rounded-full bg-primary px-5 py-3 font-medium text-primary-foreground">Browse all pages</Link></div>;
}
