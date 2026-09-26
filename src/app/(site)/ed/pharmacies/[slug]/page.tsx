import { ArrowUpRight, ExternalLink, FileCheck2, Flag, MapPin, PackageSearch, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { cache } from "react";

import { getPublicProvider } from "@/actions/providers/public-providers";
import { Button } from "@/components/common/button";
import { OfferResults } from "@/components/ed/offer-results";
import { PageShell } from "@/components/ed/page-shell";
import { PharmacyAvatar } from "@/components/ed/pharmacy-avatar";
import { PublicEmptyState } from "@/components/ed/public-empty-state";
import Link from "@/components/Link";
import { formatShortDate } from "@/lib/comparison";
import { formatPence } from "@/lib/money";
import { regulatorRegisterUrls, regulatorTypeLabels } from "@/lib/provider-labels";
import { pomPricingRobots } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import type { PublicProviderProfile } from "@/types/comparison";

import type { Metadata } from "next";

export const revalidate = 300;

// generateMetadata and the page both need the profile — one query per request.
const loadProvider = cache(getPublicProvider);

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function breadcrumbSchema(provider: PublicProviderProfile) {
  if (!siteUrl) return null;
  const items = [
    { name: "Home", path: "/" },
    { name: "Pharmacies", path: "/ed/pharmacies" },
    { name: provider.name, path: `/ed/pharmacies/${provider.slug}` },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: new URL(item.path, siteUrl).href })),
  };
}

export async function generateMetadata(props: PageProps<"/ed/pharmacies/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const provider = await loadProvider(slug);
  if (!provider) notFound();
  return {
    title: `${provider.name} — ED treatment prices and registration`,
    description: `${provider.name} (${provider.websiteDomain}): regulator registration, checked evidence and ${provider.offerCount > 0 ? `${provider.offerCount} current sildenafil and tadalafil prices` : "ED treatment prices"} with delivery and consultation costs.`,
    alternates: { canonical: `/ed/pharmacies/${provider.slug}` },
    robots: pomPricingRobots,
  };
}

export default async function PharmacyProfilePage(props: PageProps<"/ed/pharmacies/[slug]">) {
  const { slug } = await props.params;
  const provider = await loadProvider(slug);
  if (!provider) notFound();
  const schema = breadcrumbSchema(provider);
  const now = new Date();
  const operatedBy = provider.legalName !== provider.name ? `Operated by ${provider.legalName}. ` : "";

  return (
    <PageShell
      title={provider.name}
      heading={<span className="flex items-center gap-4 sm:gap-5"><PharmacyAvatar name={provider.name} size="lg" /><span className="min-w-0 break-words">{provider.name}</span></span>}
      eyebrow="Pharmacies / Pharmacy profile"
      description={`${operatedBy}Registered with the ${regulatorTypeLabels[provider.regulatorType]}, reference ${provider.regulatorReference}. Prices below are read from ${provider.websiteDomain} and show when each was last checked.`}
      crumbs={[{ label: "Home", href: "/" }, { label: "Pharmacies", href: "/ed/pharmacies" }]}
      aside={(
        <div className="w-full rounded-3xl border border-border bg-card/80 p-5 shadow-(--shadow) backdrop-blur lg:w-72">
          {provider.lowestPerTabletPence !== null && (
            <>
              <p className="text-xs text-muted-foreground">Prices from</p>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatPence(provider.lowestPerTabletPence)}<span className="text-base font-normal text-muted-foreground"> / tablet</span></p>
            </>
          )}
          <Button
            size="lg"
            className="mt-4 w-full rounded-full transition-transform active:scale-95"
            nativeButton={false}
            render={
              <a href={`https://${provider.websiteDomain}`} target="_blank" rel="nofollow noopener noreferrer">
                Visit {provider.websiteDomain}
                <ArrowUpRight aria-hidden="true" className="size-4" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            }
          />
          <p className="mt-3 text-xs text-muted-foreground">The consultation and purchase happen on the pharmacy&apos;s own website.</p>
        </div>
      )}
    >
      {schema ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} /> : null}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          {provider.offers.length === 0 ? (
            <PublicEmptyState icon={PackageSearch} title="Prices are being checked" description={`We haven't published a current price for ${provider.name} yet. Compare other pharmacies in the meantime.`} action={{ href: "/ed/compare", label: "Compare prices" }} />
          ) : (
            <OfferResults offers={provider.offers} sort="tablet" now={now} context="profile" />
          )}
        </div>
        <aside aria-label="Registration and evidence" className="space-y-5 lg:pt-10">
          <section className="rounded-3xl border border-border bg-card p-6 motion-safe:animate-fade-up">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck aria-hidden="true" className="size-5 text-primary" />Registration</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-muted-foreground">Regulator</dt><dd className="font-medium">{regulatorTypeLabels[provider.regulatorType]}</dd></div>
              <div><dt className="text-muted-foreground">Registration number</dt><dd className="font-medium tabular-nums">{provider.regulatorReference}</dd></div>
              {provider.dispensingPartnerName ? <div><dt className="text-muted-foreground">Dispensing pharmacy</dt><dd className="font-medium">{provider.dispensingPartnerName}</dd></div> : null}
              {provider.serviceRegions.length > 0 && (
                <div>
                  <dt className="text-muted-foreground">Delivers to</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">{provider.serviceRegions.map((region) => <span key={region} className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs"><MapPin aria-hidden="true" className="size-3" />{region}</span>)}</dd>
                </div>
              )}
            </dl>
            <a href={regulatorRegisterUrls[provider.regulatorType]} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-1 text-sm underline underline-offset-4 hover:text-muted-foreground">
              Check the public register yourself<ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          </section>
          {provider.evidence.length > 0 && (
            <section className="rounded-3xl border border-border bg-card p-6 motion-safe:animate-fade-up" style={{ animationDelay: "120ms" }}>
              <h2 className="flex items-center gap-2 text-lg font-semibold"><FileCheck2 aria-hidden="true" className="size-5 text-primary" />Checked evidence</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {provider.evidence.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3">
                    <a href={item.sourceUrl} target="_blank" rel="nofollow noopener noreferrer" className="min-w-0 truncate underline underline-offset-4 hover:text-muted-foreground">{hostname(item.sourceUrl)}</a>
                    {item.checkedAt ? <time dateTime={item.checkedAt.toISOString()} className="shrink-0 text-xs text-muted-foreground">{formatShortDate(item.checkedAt)}</time> : null}
                  </li>
                ))}
              </ul>
              <Link href="/ed/trust/pharmacy-evidence" className="mt-5 inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">What we check, and what it doesn&apos;t tell you</Link>
            </section>
          )}
          <section className="rounded-3xl border border-dashed border-border p-6">
            <h2 className="flex items-center gap-2 font-semibold"><Flag aria-hidden="true" className="size-4" />Spotted something wrong?</h2>
            <p className="mt-2 text-sm text-muted-foreground">If a price or detail here is out of date, let us know and we&apos;ll re-check it.</p>
            <Link href={`/ed/pharmacies/claim?pharmacy=${provider.slug}`} className="mt-4 inline-block text-sm font-medium underline underline-offset-4">Request a correction</Link>
          </section>
        </aside>
      </div>
    </PageShell>
  );
}
