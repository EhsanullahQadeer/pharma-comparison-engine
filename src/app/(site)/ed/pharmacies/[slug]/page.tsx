import { notFound } from "next/navigation";
import { cache } from "react";

import { getPublicProvider } from "@/actions/providers/public-providers";
import { getLinkedProviderIds } from "@/actions/referrals/outbound-links";
import { PharmacyLayout } from "@/components/ed/pharmacy-page/pharmacy-layout";
import { buildPharmacyPageModel } from "@/lib/pharmacy-page";
import { pomPricingRobots, serializeJsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import type { PharmacyPageModel } from "@/types/pharmacy-page";

import type { Metadata } from "next";

export const revalidate = 300;

// generateMetadata and the page both need the profile — one query per request.
const loadProvider = cache(getPublicProvider);

function breadcrumbSchema(model: PharmacyPageModel) {
  if (!siteUrl) return null;
  const items = [
    { name: "Home", path: "/" },
    { name: "Pharmacies", path: "/ed/pharmacies" },
    { name: model.provider.name, path: `/ed/pharmacies/${model.provider.slug}` },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: new URL(item.path, siteUrl).href })),
  };
}

// The FAQ every layout renders, word for word (SEO rule 6: structured data only describes what's
// actually on the page and true).
function faqSchema(model: PharmacyPageModel) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: model.faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
  };
}

export async function generateMetadata(props: PageProps<"/ed/pharmacies/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const provider = await loadProvider(slug);
  if (!provider) notFound();
  return {
    title: `${provider.name} discount codes, prices and checks`,
    description: `${provider.name} (${provider.websiteDomain}): checked discount codes and offers, ${provider.offerCount > 0 ? `${provider.offerCount} current sildenafil and tadalafil prices` : "ED treatment prices"} with delivery included, and its regulator registration.`,
    alternates: { canonical: `/ed/pharmacies/${provider.slug}` },
    robots: pomPricingRobots,
  };
}

export default async function PharmacyProfilePage(props: PageProps<"/ed/pharmacies/[slug]">) {
  const { slug } = await props.params;
  const [provider, linkedProviderIds] = await Promise.all([loadProvider(slug), getLinkedProviderIds()]);
  if (!provider) notFound();
  // Only linked (affiliate-approved) pharmacies get a URL; everyone else is listed in full without one.
  const model = buildPharmacyPageModel(provider, linkedProviderIds.has(provider.id), new Date());
  const breadcrumbs = breadcrumbSchema(model);

  return (
    <>
      {breadcrumbs ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs) }} /> : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqSchema(model)) }} />
      <PharmacyLayout model={model} />
    </>
  );
}
