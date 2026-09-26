import Link from "@/components/Link";

export default function EDLayout({ children }: { children: React.ReactNode }) {
  return <div className="pb-28 sm:pb-20">
    {children}
    <aside aria-label="Price information" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm">
        <p><span className="font-medium">Prices are read from each pharmacy&apos;s own website.</span> <span className="text-muted-foreground">Always confirm the final price at checkout.</span></p>
        <Link href="/ed/compare" className="rounded-full bg-primary px-4 py-2 font-medium text-foreground transition-colors hover:bg-primary/80">Compare prices</Link>
      </div>
    </aside>
  </div>;
}
