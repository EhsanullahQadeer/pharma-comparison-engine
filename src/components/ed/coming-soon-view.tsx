import { ArrowRight, Clock3, Circle } from "lucide-react";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/ed/page-shell";
import Link from "@/components/Link";
import { deliveryStages, edHref, edPages, groupLabels } from "@/lib/ed-pages";
import type { EdPage } from "@/lib/ed-pages";

import type { Metadata } from "next";

// Rendered by /ed/[...slug] for catalogue pages that aren't live yet (and articles not yet published).
export function findComingSoonPage(path: string) {
  return edPages.find((entry) => entry.path === path && !entry.live);
}

export function comingSoonMetadata(page: EdPage): Metadata {
  return { title: `${page.title} — Coming soon`, description: page.description, robots: { index: false, follow: true } };
}

// Medical/educational pages are waiting on clinical review, not on development.
const previewCopy = {
  article: { heading: "Being written and clinically reviewed", body: "This guide is published only after a named reviewer has checked it against its sources. Until then, speak to a pharmacist, your GP or NHS 111 for advice." },
  preview: { heading: "A preview of what is planned", body: "This page shows the intended scope. Its listings, prices, forms or reviewed information are not available yet." },
};

export function ComingSoonView({ page }: { page: EdPage }) {
  const stage = deliveryStages.find((entry) => entry.id === page.stage);
  if (!stage) notFound();
  const related = edPages.filter((entry) => entry.group === page.group && entry.path !== page.path);
  const copy = previewCopy[page.kind === "article" ? "article" : "preview"];
  return (
    <PageShell title={page.title} eyebrow={`${groupLabels[page.group]} / ${page.section}`} description={page.description}>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 lg:col-span-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm"><Clock3 aria-hidden="true" className="size-4" />Coming soon</span>
          <h2 className="mt-6 text-2xl font-semibold">{copy.heading}</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{copy.body}</p>
          <div className="mt-6 rounded-2xl border border-border bg-background p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delivery area · {stage.milestone}</p>
            <h3 className="mt-2 text-lg font-semibold">{stage.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{stage.description}</p>
            <ul className="mt-4 space-y-3 text-sm">{stage.remaining.map((item) => <li key={item} className="flex gap-2"><Circle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />{item}</li>)}</ul>
          </div>
          <Link href="/ed/roadmap" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-foreground">View build progress<ArrowRight aria-hidden="true" className="size-4" /></Link>
        </section>
        <aside className="rounded-3xl border border-border p-6 sm:p-8">
          <p className="text-sm font-medium text-muted-foreground">Available now</p>
          <h2 className="mt-3 text-xl font-semibold">Compare checked prices</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Browse registered pharmacies and compare sildenafil and tadalafil prices, with delivery and consultation costs included.</p>
          <div className="mt-6 space-y-4 text-sm">
            <Link href="/ed/compare" className="block underline underline-offset-4">Compare ED treatment prices</Link>
            <Link href="/ed/pharmacies" className="block underline underline-offset-4">Browse the pharmacy directory</Link>
          </div>
        </aside>
      </div>
      <section className="mt-12">
        <h2 className="text-2xl font-semibold">More in {groupLabels[page.group]}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{related.map((entry) => <Link key={entry.path} href={edHref(entry.path)} className="rounded-2xl border border-border p-5 transition-colors hover:bg-muted"><span className="block text-xs text-muted-foreground">{entry.live ? "Live now" : "Coming soon"}</span><span className="mt-1 block font-medium">{entry.title}</span></Link>)}</div>
      </section>
    </PageShell>
  );
}
