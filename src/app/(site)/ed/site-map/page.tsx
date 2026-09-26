import { PageShell } from "@/components/ed/page-shell";
import Link from "@/components/Link";
import { edHref, navigationGroups } from "@/lib/ed-pages";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All pages",
  description: "Every page on the UK ED price comparison site: pharmacies, prices, guides, side effects, tools and our policies.",
  alternates: { canonical: "/ed/site-map" },
};

// Human-readable site map built from the same catalogue as the navigation, so it can't drift.
export default function SiteMapPage() {
  return (
    <PageShell title="All pages" eyebrow="Site map" description="Everything on the site, grouped the same way as the menu." crumbs={[{ label: "Home", href: "/" }]}>
      <div className="mt-10 space-y-12">
        {navigationGroups.map((group) => (
          <section key={group.id} aria-labelledby={`site-map-${group.id}`}>
            <h2 id={`site-map-${group.id}`} className="text-2xl font-semibold">{group.label}</h2>
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              {group.sections.map((section) => (
                <div key={section.label} className="rounded-3xl border border-border bg-card p-6">
                  <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{section.label}</h3>
                  <ul className="mt-4 space-y-4">
                    {section.pages.map((page) => (
                      <li key={page.path}>
                        <Link href={edHref(page.path)} className="font-medium underline-offset-4 hover:underline">{page.title}</Link>
                        <p className="mt-1 text-sm text-muted-foreground">{page.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
