import type { Metadata } from "next";
import Link from "@/components/Link";

export const metadata: Metadata = { title: "ED page not found", description: "This page is not part of the ED platform. Explore the planned routes through build progress.", robots: { index: false } };

export default function NotFound() {
  return <div className="mx-auto max-w-6xl px-6 py-24"><p className="text-sm text-muted-foreground">404</p><h1 className="mt-4 text-4xl font-semibold">This page could not be found</h1><p className="mt-4 text-muted-foreground">Explore the ED platform’s planned pages from the navigation or build progress.</p><Link href="/ed/roadmap" className="mt-6 inline-block rounded-full bg-primary px-5 py-3 font-medium text-foreground">View build progress</Link></div>;
}
