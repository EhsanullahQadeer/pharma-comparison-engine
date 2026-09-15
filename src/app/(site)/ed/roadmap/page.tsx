import type { Metadata } from "next";
import { CheckCircle2, Circle } from "lucide-react";
import Link from "@/components/Link";
import { PageShell } from "@/components/ed/page-shell";
import { deliveryStages, edHref, edPages } from "@/lib/ed-pages";

export const metadata: Metadata = { title: "ED platform build progress", description: "What is built, what comes next and what remains in the ED pharmacy comparison platform.", robots: { index: false, follow: true } };

export default function RoadmapPage() {
  return <PageShell title="What we’re building" eyebrow="ED platform / Build progress" description="A clear view of the ED comparison platform: the preview is ready, pharmacy listings come first, and the remaining features are planned below.">
    <section className="mt-10 rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="flex items-center gap-3"><CheckCircle2 aria-hidden="true" className="size-6" /><h2 className="text-2xl font-semibold">Built: the platform preview</h2></div>
      <p className="mt-4 text-muted-foreground">Landing design, shared navigation, mobile menus and {edPages.length} ED coming-soon destinations. These are page previews; pharmacy listings, automatic imports and price comparisons are still to be built.</p>
    </section>
    <div className="mt-8 space-y-6">{deliveryStages.map((stage) => <section key={stage.id} className="rounded-3xl border border-border p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-3"><span className="flex size-9 items-center justify-center rounded-full bg-secondary font-semibold">{stage.id}</span><span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">{stage.status}</span><span className="text-xs text-muted-foreground">Roadmap {stage.milestone}</span></div>
      <h2 className="mt-5 text-2xl font-semibold">{stage.title}</h2><p className="mt-3 max-w-3xl text-muted-foreground">{stage.description}</p>
      <h3 className="mt-6 text-sm font-semibold">Remaining work</h3>
      <ul className="mt-3 grid gap-3 md:grid-cols-3">{stage.remaining.map((item) => <li key={item} className="flex gap-2 rounded-xl bg-card p-4 text-sm"><Circle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />{item}</li>)}</ul>
      <div className="mt-5 flex flex-wrap gap-3">{edPages.filter((page) => page.stage === stage.id).map((page) => <Link key={page.path} href={edHref(page.path)} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">{page.title}<span className="sr-only"> — coming soon</span></Link>)}</div>
    </section>)}</div>
    <p className="mt-8 text-sm text-muted-foreground">Delivery areas show priority, not promised release dates. Content and safety review can run alongside directory development. Optional features are outside the initial launch.</p>
  </PageShell>;
}
