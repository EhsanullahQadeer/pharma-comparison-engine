import Link from "@/components/Link";

export default function EDLayout({ children }: { children: React.ReactNode }) {
  return <div className="pb-28 sm:pb-20">
    {children}
    <aside aria-label="Platform status" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm">
        <p><span className="font-medium">ED comparison preview.</span> <span className="text-muted-foreground">Pharmacy listings come first.</span></p>
        <Link href="/ed/pharmacies" className="rounded-full bg-primary px-4 py-2 font-medium text-foreground">Explore pharmacy plans</Link>
      </div>
    </aside>
  </div>;
}
