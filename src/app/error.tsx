"use client";

import { useEffect } from "react";

// Root-level fallback for errors outside the (site) route group (e.g. the admin section, which
// doesn't yet have its own error.tsx). Renders inside the root layout's <html>/<body> but without
// any section-specific chrome, since it doesn't know which section it's in.
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-sm text-muted-foreground">Something went wrong</p>
      <h1 className="mt-4 text-3xl font-semibold">This page could not be shown</h1>
      <p className="mt-4 max-w-md text-muted-foreground">An unexpected error occurred. Nothing was saved or changed as a result.</p>
      <button type="button" onClick={reset} className="mt-6 rounded-full bg-primary px-5 py-3 font-medium text-primary-foreground hover:bg-primary/80">Try again</button>
    </div>
  );
}
