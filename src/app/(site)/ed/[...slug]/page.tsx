import { ArrowRight, Clock3, Circle } from "lucide-react";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/ed/page-shell";
import Link from "@/components/Link";
import { deliveryStages, edHref, edPages, groupLabels } from "@/lib/ed-pages";

import type { Metadata } from "next";

export const dynamicParams = false;
export function generateStaticParams() {
  return edPages.map((page) => ({ slug: page.path.split("/") }));
}

async function resolvePage(params: Promise<{ slug: string[] }>) {
  const { slug } = await params;
  const page = edPages.find((entry) => entry.path === slug.join("/"));
  if (!page) notFound();
  return page;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const page = await resolvePage(params);
  return { title: `${page.title} — Coming soon`, description: page.description, robots: { index: false, follow: true } };
}

export default async function ComingSoonPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const page = await resolvePage(params);
  const stage = deliveryStages.find((entry) => entry.id === page.stage);
  if (!stage) notFound();
  const related = edPages.filter((entry) => entry.group === page.group && entry.path !== page.path);
  return (
    <PageShell title={page.title} eyebrow={`${groupLabels[page.group]} / ${page.section}`} description={page.description}>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 lg:col-span-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm"><Clock3 aria-hidden="true" className="size-4" />Coming soon</span>
          <h2 className="mt-6 text-2xl font-semibold">A preview of what is planned</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">This page shows the intended scope. Its listings, prices, forms or reviewed information are not available yet.</p>
          <div className="mt-6 rounded-2xl border border-border bg-background p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delivery area · {stage.milestone}</p>
            <h3 className="mt-2 text-lg font-semibold">{stage.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{stage.description}</p>
            <ul className="mt-4 space-y-3 text-sm">{stage.remaining.map((item) => <li key={item} className="flex gap-2"><Circle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />{item}</li>)}</ul>
          </div>
          <Link href="/ed/roadmap" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-foreground">View build progress<ArrowRight aria-hidden="true" className="size-4" /></Link>
        </section>
        <aside className="rounded-3xl border border-border p-6 sm:p-8">
          <p className="text-sm font-medium text-muted-foreground">First delivery priority</p>
          <h2 className="mt-3 text-xl font-semibold">Build the pharmacy directory</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Start with manual listings. Add automatic discovery with duplicate checks, evidence and staff approval before publishing.</p>
          <div className="mt-6 space-y-4 text-sm">
            <Link href="/ed/pharmacies/submit" className="block underline underline-offset-4">Manual pharmacy submissions</Link>
            <Link href="/ed/pharmacies/discovery" className="block underline underline-offset-4">Automatic discovery plan</Link>
          </div>
        </aside>
      </div>
      <section className="mt-12">
        <h2 className="text-2xl font-semibold">More in {groupLabels[page.group]}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{related.map((entry) => <Link key={entry.path} href={edHref(entry.path)} className="rounded-2xl border border-border p-5 hover:bg-muted"><span className="block text-xs text-muted-foreground">Coming soon</span><span className="mt-1 block font-medium">{entry.title}</span></Link>)}</div>
      </section>
    </PageShell>
  );
}
