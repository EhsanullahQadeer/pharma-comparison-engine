import { Search, SearchX, Store } from "lucide-react";

import { getPublicProviders } from "@/actions/providers/public-providers";
import { Input } from "@/components/common/input";
import { GradientText } from "@/components/ed/gradient-text";
import { PageShell } from "@/components/ed/page-shell";
import { PharmacyCard } from "@/components/ed/pharmacy-card";
import { PublicEmptyState } from "@/components/ed/public-empty-state";
import Link from "@/components/Link";
import { pomPricingRobots } from "@/lib/seo";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UK ED pharmacy directory — registered online pharmacies",
  description: "Browse registered UK online pharmacies offering erectile dysfunction treatment, with their regulator registration, checked evidence and current sildenafil and tadalafil prices.",
  alternates: { canonical: "/ed/pharmacies" },
  robots: pomPricingRobots,
};

const emptyStates = {
  search: <PublicEmptyState icon={SearchX} title="No pharmacies match that search" description="Try the pharmacy's trading name or website address." action={{ href: "/ed/pharmacies", label: "Show all pharmacies" }} />,
  none: <PublicEmptyState icon={Store} title="Pharmacies are being checked" description="We list a pharmacy only after checking its regulator registration and ED service. The first checked pharmacies will appear here soon." action={{ href: "/ed/trust/pharmacy-evidence", label: "How we check pharmacies" }} />,
};

export default async function PharmaciesPage(props: PageProps<"/ed/pharmacies">) {
  const { q } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const providers = await getPublicProviders(query);

  return (
    <PageShell
      title="ED pharmacy directory"
      heading={<>UK pharmacies for ED treatment, <GradientText>checked first.</GradientText></>}
      eyebrow="Pharmacies / Find a pharmacy"
      description="Every pharmacy listed here has had its regulator registration and ED service checked by our team before appearing. Pick one to see its evidence and current prices."
      crumbs={[{ label: "Home", href: "/" }]}
      aside={(
        <form action="/ed/pharmacies" role="search" className="relative w-full lg:w-80">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" type="search" defaultValue={query} placeholder="Search pharmacies…" aria-label="Search pharmacies" className="h-11 rounded-full bg-card pl-9 shadow-(--shadow)" />
        </form>
      )}
    >
      {query ? <p className="mt-8 text-sm text-muted-foreground">
          {providers.length} result{providers.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo; · <Link href="/ed/pharmacies" className="underline underline-offset-4 hover:text-foreground">Show all</Link>
        </p> : null}
      {providers.length === 0 ? emptyStates[query ? "search" : "none"] : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider, index) => <PharmacyCard key={provider.id} provider={provider} index={index} />)}
        </ul>
      )}
    </PageShell>
  );
}
