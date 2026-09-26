import { ArrowRight } from "lucide-react";

import Link from "@/components/Link";
import { revealClass, revealStyle } from "@/lib/motion";
import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// Shared building blocks for the public information pages (how it works, policies, process pages),
// so each page is content, not repeated layout.

export function ContentSection({ id, title, intro, children }: { id: string; title: string; intro?: string; children?: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-14">
      <h2 id={id} className="text-2xl font-semibold tracking-tight">{title}</h2>
      {intro ? <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">{intro}</p> : null}
      {children}
    </section>
  );
}

export type InfoCard = { icon: LucideIcon; title: string; body: string };

export function InfoCardGrid({ items, columns = 3 }: { items: InfoCard[]; columns?: 2 | 3 | 4 }) {
  const grid = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns];
  return (
    <ul className={`mt-6 grid gap-4 ${grid}`}>
      {items.map(({ icon: Icon, title, body }, index) => (
        <li key={title} className={`group rounded-3xl border border-border bg-card p-6 shadow-(--shadow) transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 ${revealClass}`} style={revealStyle(index)}>
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 transition-transform duration-300 group-hover:scale-110"><Icon aria-hidden="true" className="size-5" /></span>
          <h3 className="mt-4 font-semibold">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
        </li>
      ))}
    </ul>
  );
}

export function StepList({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="mt-6 space-y-4">
      {steps.map((step, index) => (
        <li key={step.title} className={`flex gap-4 rounded-3xl border border-border bg-card p-5 sm:p-6 ${revealClass}`} style={revealStyle(index)}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{index + 1}</span>
          <div>
            <h3 className="font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// `columns={1}` for narrow placements such as a sidebar beside a form.
export function PointList({ points, columns = 2 }: { points: string[]; columns?: 1 | 2 }) {
  return (
    <ul className={cn("mt-5 grid gap-3", columns === 2 && "sm:grid-cols-2")}>
      {points.map((point) => (
        <li key={point} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed">
          <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
          {point}
        </li>
      ))}
    </ul>
  );
}

export function CallToAction({ title, body, href, label }: { title: string; body: string; href: string; label: string }) {
  return (
    <section className="relative mt-16 overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-10">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -bottom-24 size-72 rounded-full opacity-30 blur-3xl motion-safe:animate-float" style={{ background: "radial-gradient(circle, var(--chart-1) 0%, var(--chart-2) 55%, transparent 72%)" }} />
      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-2 text-muted-foreground">{body}</p>
        </div>
        <Link href={href} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground transition-all hover:gap-3 hover:bg-primary/80">
          {label}<ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </section>
  );
}
