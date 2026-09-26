import Link from "@/components/Link";
import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="border-t border-border px-6 pt-10 pb-32">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <span className="inline-block size-3 rounded-full border-2 border-primary" />
          {siteConfig.brandShortName}
        </span>
        <p>&copy; {new Date().getFullYear()} {siteConfig.brandShortName}. All rights reserved.</p>
      </div>
      <div className="mx-auto mt-6 max-w-6xl space-y-4 text-sm text-muted-foreground">
        <p>An independent comparison of registered UK pharmacies for ED treatment. Consultations and purchases take place with the pharmacy.</p>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-3">
          <Link href="/ed/site-map" className="hover:underline">All pages</Link>
          <Link href="/ed/trust/about" className="hover:underline">About</Link>
          <Link href="/ed/independence" className="hover:underline">Independence</Link>
          <Link href="/ed/privacy" className="hover:underline">Privacy</Link>
          <Link href="/ed/terms" className="hover:underline">Terms</Link>
          <Link href="/ed/contact" className="hover:underline">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
