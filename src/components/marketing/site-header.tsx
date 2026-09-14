import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Compare Prices", href: "#compare" },
  { label: "Pharmacies", href: "#pharmacies" },
  { label: "Insights", href: "#insights" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-block size-4 rounded-full border-2 border-primary" />
          PharmaCompare
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Search"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Search className="size-4" />
          </button>
          <Button
            size="sm"
            className="rounded-full px-5"
            nativeButton={false}
            render={<Link href="#get-started">Get Started</Link>}
          />
        </div>
      </div>
    </header>
  );
}
