import Link from "@/components/Link";

import type { ReactNode } from "react";

export function PageShell({ title, eyebrow, description, children }: { title: string; eyebrow: string; description: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:py-16">
      <nav aria-label="Breadcrumb" className="mb-10 flex flex-wrap gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:underline">Home</Link><span aria-hidden="true">/</span>
        <Link href="/ed/roadmap" className="hover:underline">ED platform</Link><span aria-hidden="true">/</span>
        <span aria-current="page">{title}</span>
      </nav>
      <p className="mb-4 text-sm font-medium text-muted-foreground">{eyebrow}</p>
      <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{title}</h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}
