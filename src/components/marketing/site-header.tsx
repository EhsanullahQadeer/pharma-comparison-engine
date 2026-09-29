"use client";

import { ChevronDown, Menu, X, ArrowUpRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import Link from "@/components/Link";
import { edHref, navigationGroups } from "@/lib/ed-pages";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const close = useCallback(() => {
    headerRef.current?.querySelectorAll("details[open]").forEach((element) => element.removeAttribute("open"));
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const summary = headerRef.current?.querySelector<HTMLElement>("details[open] > summary");
      if (mobileOpen) toggleRef.current?.focus();
      else summary?.focus();
      close();
    };
    const resize = () => close();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", resize);
    window.addEventListener("popstate", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", resize);
      window.removeEventListener("popstate", close);
    };
  }, [close, mobileOpen]);

  return (
    <header ref={headerRef} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) close(); }} className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="border-b border-border bg-secondary px-4 py-2 text-center text-xs text-secondary-foreground">
        New <span aria-hidden="true">·</span> Compare ED treatment prices from checked UK pharmacies
        <Link href="/ed/compare" onClick={close} className="ml-3 font-medium underline underline-offset-4">Compare prices</Link>
      </div>
      <div className="relative mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-6">
        <Link href="/" onClick={close} className="flex shrink-0 items-center gap-2 font-semibold">
          <span aria-hidden="true" className="inline-block size-4 rounded-full border-2 border-primary" />
          <span>{siteConfig.brandShortName}<span className="block text-xs font-normal text-muted-foreground">{siteConfig.tagline}</span></span>
        </Link>
        <nav id="primary-navigation" aria-label="Main navigation" className={cn("absolute inset-x-0 top-full max-h-[70dvh] overflow-y-auto border-b border-border bg-background p-4 lg:static lg:block lg:overflow-visible lg:border-0 lg:p-0", mobileOpen ? "block" : "hidden")}>
          <div className="lg:flex lg:items-center lg:gap-1">
            {navigationGroups.map((group) => (
              <details key={group.id} name="ed-navigation" className="group border-b border-border lg:border-0">
                <summary className={cn("flex cursor-pointer list-none items-center justify-between gap-1 rounded-lg px-3 py-3 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden", group.sections.some((section) => section.pages.some((page) => edHref(page.path) === pathname)) && "bg-muted font-medium")}>
                  {group.label}<ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-open:rotate-180" />
                </summary>
                <div className="p-3 lg:absolute lg:inset-x-4 lg:top-full lg:max-h-[70dvh] lg:overflow-y-auto lg:rounded-b-2xl lg:border lg:border-border lg:bg-background lg:p-6 lg:shadow-lg">
                  <div className="mb-5 border-b border-border pb-4">
                    <p className="font-medium">{group.label} for ED treatment</p>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {group.sections.map((section) => (
                      <div key={section.label}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.label}</p>
                        <ul className="space-y-1">
                          {section.pages.map((page) => (
                            <li key={page.path}><Link href={edHref(page.path)} onClick={close} aria-current={pathname === edHref(page.path) ? "page" : undefined} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:bg-muted aria-[current=page]:font-semibold">{page.title}</Link></li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <Link href="/ed/site-map" onClick={close} className="mt-5 inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4">Browse every page <ArrowUpRight aria-hidden="true" className="size-4" /></Link>
                </div>
              </details>
            ))}
          </div>
        </nav>
        <Link href="/ed/pharmacies" onClick={close} className="hidden shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 xl:block">Explore pharmacies</Link>
        <button ref={toggleRef} type="button" onClick={() => { if (mobileOpen) close(); else setMobileOpen(true); }} aria-expanded={mobileOpen} aria-controls="primary-navigation" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} className="rounded-lg p-3 hover:bg-muted lg:hidden">
          {mobileOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        </button>
      </div>
    </header>
  );
}
