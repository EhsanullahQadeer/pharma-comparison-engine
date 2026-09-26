import Link from "@/components/Link";
import { revealClass, revealStyle } from "@/lib/motion";

import type { ReactNode } from "react";

type Crumb = { label: string; href: string };

const defaultCrumbs: Crumb[] = [{ label: "Home", href: "/" }, { label: "All pages", href: "/ed/site-map" }];

export function PageShell({ title, heading, eyebrow, description, crumbs = defaultCrumbs, aside, children }: {
  title: string;
  // Optional richer <h1> content (e.g. a gradient accent); `title` stays the plain-text breadcrumb.
  heading?: ReactNode;
  eyebrow: string;
  description: string;
  crumbs?: Crumb[];
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-24 -z-10 size-112 rounded-full opacity-30 blur-3xl motion-safe:animate-float dark:opacity-20"
        style={{ background: "radial-gradient(circle, var(--chart-1) 0%, var(--chart-2) 50%, transparent 72%)" }}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <nav aria-label="Breadcrumb" className="mb-10 flex flex-wrap gap-2 text-sm text-muted-foreground">
          {crumbs.map((crumb) => (
            <span key={crumb.href} className="flex gap-2">
              <Link href={crumb.href} className="transition-colors hover:text-foreground hover:underline">{crumb.label}</Link>
              <span aria-hidden="true">/</span>
            </span>
          ))}
          <span aria-current="page" className="text-foreground">{title}</span>
        </nav>
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <div className={revealClass}>
            <p className="mb-4 text-sm font-medium text-muted-foreground">{eyebrow}</p>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{heading ?? title}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">{description}</p>
          </div>
          {aside ? <div className={revealClass} style={revealStyle(2, 80)}>{aside}</div> : null}
        </div>
        {children}
      </div>
    </div>
  );
}
