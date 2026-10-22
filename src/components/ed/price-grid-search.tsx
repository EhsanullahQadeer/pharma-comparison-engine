"use client";

import { Search, X } from "lucide-react";
import { useCallback, type FormEvent } from "react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { toolbarButton } from "@/components/ed/price-grid-controls";
import Link from "@/components/Link";
import { useRouter } from "@/hooks/useRouter";

// Pharmacy name search. The grid itself filters on the server from `q`; this only puts the term
// in the URL. `baseHref` is the current view without any search.
export function PriceGridSearch({ baseHref, query }: { baseHref: string; query?: string }) {
  const router = useRouter();
  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const term = String(new FormData(event.currentTarget).get("q") ?? "").trim();
      const url = new URL(baseHref, window.location.origin);
      if (term) url.searchParams.set("q", term);
      router.push(`${url.pathname}${url.search}`, { scroll: false });
    },
    [baseHref, router],
  );

  return (
    <form role="search" onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <label htmlFor="pharmacy-search" className="text-sm font-medium">Search</label>
      <Input id="pharmacy-search" name="q" type="search" defaultValue={query} placeholder="Pharmacy name" maxLength={60} className="h-9 w-56 rounded-full" />
      <Button type="submit" size="sm" variant="outline" className={toolbarButton}>
        <Search aria-hidden="true" className="size-4" />
        Find
      </Button>
      {query ? (
        <Link href={baseHref} scroll={false} className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          <X aria-hidden="true" className="size-3.5" />Clear search
        </Link>
      ) : null}
    </form>
  );
}
