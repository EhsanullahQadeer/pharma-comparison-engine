"use client";

import { useEffect } from "react";

import Link from "@/components/Link";

// Next.js App Router error-boundary convention (must be a Client Component). Scoped to the
// (site) route group so it renders inside SiteHeader/SiteFooter, matching not-found.tsx/loading.tsx's
// existing tone rather than falling through to the bare root error.tsx.
export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-24">
      <p className="text-sm text-muted-foreground">Something went wrong</p>
      <h1 className="mt-4 text-4xl font-semibold">This page could not be shown</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        An unexpected error stopped this page from loading. Nothing was saved or changed as a result — try again, or head back to the build progress overview.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="rounded-full bg-primary px-5 py-3 font-medium text-foreground hover:bg-primary/80">Try again</button>
        <Link href="/ed/roadmap" className="rounded-full border border-border px-5 py-3 font-medium hover:bg-muted">View build progress</Link>
      </div>
    </div>
  );
}
