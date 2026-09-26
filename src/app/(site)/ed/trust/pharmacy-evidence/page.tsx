import { ArrowRight, CheckCircle2, ChevronDown, ExternalLink, ScrollText, ShieldCheck } from "lucide-react";

import { Button } from "@/components/common/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { PageShell } from "@/components/ed/page-shell";
import Link from "@/components/Link";
import { edHref, edPages, groupLabels } from "@/lib/ed-pages";
import { serializeJsonLd } from "@/lib/seo";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pharmacy evidence and checks — not an invented score",
  description: "How we check a pharmacy's regulator registration and ED-service evidence before listing it, and why we publish sourced evidence instead of a single composite score.",
  alternates: { canonical: "/ed/trust/pharmacy-evidence" },
};

const VALUE_PROPS = [
  "Registration checked against the GPhC or PSNI register, not self-reported",
  "Every check dated and sourced — no unexplained claims",
  "No pharmacy can pay to raise its evidence status",
];

const VERIFICATION_STEPS = [
  { status: "Discovered", description: "A pharmacy is found through manual research or an approved source. Nothing about it is confirmed yet." },
  { status: "Identity verified", description: "Its legal name, trading name and website domain are matched against the regulator register it claims to hold." },
  { status: "ED-service verified", description: "We confirm it runs an actual ED consultation and prescribing pathway, not just a listing page." },
  { status: "Published", description: "A reviewer approves the evidence before the profile goes live, with a source link and checked date attached." },
];

const REGULATOR_PRINCIPLES = [
  { name: "Governance", detail: "Risk management, incident recording and safeguarding arrangements." },
  { name: "Staff", detail: "Whether staff are suitably qualified, trained and supported to raise concerns." },
  { name: "Premises", detail: "Whether the premises are safe, clean and suitable for the services offered." },
  { name: "Services, including medicines management", detail: "How medicines are sourced, stored and supplied safely — the most relevant principle for online prescribing." },
  { name: "Equipment and facilities", detail: "Whether equipment, including cold storage, is fit for purpose and protects confidentiality." },
];

const COMPARISON_ROWS = [
  { aspect: "Who decides", evidence: "The regulator (GPhC or PSNI)", reviews: "Individual customers" },
  { aspect: "What it measures", evidence: "Registration and service-verification facts", reviews: "Personal experience of ordering and delivery" },
  { aspect: "Answers the question", evidence: "Is this a genuine, registered pharmacy?", reviews: "What was it like to use?" },
  { aspect: "Can it be influenced by payment", evidence: "No — evidence status isn't for sale", reviews: "Varies by review platform" },
  { aspect: "What it misses", evidence: "Says nothing about delivery speed or customer service", reviews: "Says nothing about registration or medicines handling" },
];

const LIMITATIONS = [
  "It's a snapshot from the last checked date, not a live feed of the regulator's register.",
  "It doesn't rate service quality — read genuine customer reviews for that.",
  "A missing published inspection outcome isn't automatically a failure — not every pharmacy has one yet.",
  "It isn't medical advice and doesn't recommend a pharmacy, product or dose.",
];

const VERIFY_STEPS = [
  { title: "Find the registration number", description: "Usually in the footer or an “About” or “Legal” page — a GPhC number, or a PSNI registration reference for Northern Ireland." },
  { title: "Search the regulator's public register", description: "Check the GPhC register or the PSNI register directly, and confirm the trading name and address match what the pharmacy shows you." },
  { title: "Look for a published inspection outcome", description: "Where the GPhC has inspected the premises, the outcome is public. Check which of the five standards it covers before treating an absence as a problem." },
  { title: "Confirm a prescriber is actually involved", description: "A genuine ED pathway includes a real clinical assessment before supply — not just a form and a checkout page." },
];

const FAQS = [
  { q: "What is “pharmacy evidence” on this site?", a: "It's the set of checks we run before listing a pharmacy: confirming its regulator registration, verifying it runs a genuine ED consultation pathway, and recording a source and checked date for each claim." },
  { q: "Why don't you publish a single pharmacy score?", a: "A single number hides which specific thing passed or failed, and invites treating an estimate as a guarantee. We'd rather show the underlying evidence and let you weigh it yourself." },
  { q: "Is this the same as a customer review rating?", a: "No. Customer reviews tell you about service experience; regulator evidence tells you whether a pharmacy is genuinely registered and running the service it claims to. Check both before you buy." },
  { q: "Can a pharmacy pay to improve its evidence status?", a: "No. Evidence status reflects what a reviewer has confirmed against the regulator register and our ED-service checks, independent of any commercial relationship." },
  { q: "What if a pharmacy has no published inspection outcome?", a: "That's an explicit “not yet available” state, not a fail. Registration on the regulator's register is the baseline check; a published inspection report adds detail when the regulator has published one." },
  { q: "Where can I see the evidence for a pharmacy?", a: "Every pharmacy in our directory has a profile showing its registration number, a link to the regulator's register and the evidence we checked, with dates." },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function PharmacyEvidencePage() {
  const relatedTrustPages = edPages.filter((entry) => entry.group === "trust" && entry.path !== "trust/pharmacy-evidence");

  return (
    <PageShell
      title="Pharmacy evidence and checks"
      eyebrow={`${groupLabels.trust} / Our approach`}
      description="Every pharmacy we list is checked against its regulator's public register and its actual ED-service pathway — with a source link and a checked date attached to every claim. We don't compress that into a single invented safety score."
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqSchema) }} />

      <ul className="mt-10 grid gap-3 sm:grid-cols-3">
        {VALUE_PROPS.map((point) => (
          <li key={point} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold">What &ldquo;pharmacy evidence&rdquo; means here, and what it doesn&apos;t</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck aria-hidden="true" className="size-5 text-primary" />
              What it is
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">A record of specific, sourced checks — regulator registration, matched trading details and a verified ED consultation pathway — each dated and reviewed before a pharmacy is published.</p>
          </div>
          <div className="rounded-3xl border border-border p-6 sm:p-8">
            <h3 className="text-lg font-semibold">What it isn&apos;t</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">A single score, star rating or ranking. Compressing separate checks into one number hides which specific thing passed, and invites treating an estimate as a guarantee — so we don&apos;t publish one.</p>
          </div>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold">What we check before a pharmacy is listed</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">Every listed pharmacy moves through the same stages, each recorded with a source and a date.</p>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VERIFICATION_STEPS.map((step, index) => (
            <li key={step.status} className="rounded-2xl border border-border bg-card p-5">
              <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold">{index + 1}</span>
              <p className="mt-3 font-medium">{step.status}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold">The regulator&apos;s own standards, in plain English</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">Where the GPhC has published an inspection outcome for a pharmacy, it&apos;s assessed against five standards. We link to the published outcome rather than re-scoring it ourselves.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {REGULATOR_PRINCIPLES.map((principle) => (
            <div key={principle.name} className="rounded-2xl border border-border p-5">
              <p className="font-medium">{principle.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{principle.detail}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Pharmacies registered in Northern Ireland are inspected by the PSNI under an equivalent framework.</p>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold">Pharmacy evidence and customer reviews: check both</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">Neither one answers the whole question on its own.</p>
        <div className="mt-6">
          <Table resizable={false}>
            <TableHeader>
              <TableRow>
                <TableHead>Aspect</TableHead>
                <TableHead>Pharmacy evidence</TableHead>
                <TableHead>Customer reviews</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {COMPARISON_ROWS.map((row) => (
                <TableRow key={row.aspect}>
                  <TableCell className="font-medium">{row.aspect}</TableCell>
                  <TableCell className="text-muted-foreground">{row.evidence}</TableCell>
                  <TableCell className="text-muted-foreground">{row.reviews}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold">What pharmacy evidence can&apos;t tell you</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {LIMITATIONS.map((point) => (
            <li key={point} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              <ScrollText aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {point}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Check a pharmacy&apos;s registration yourself, in four steps</h2>
        <ol className="mt-6 space-y-5">
          {VERIFY_STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">{index + 1}</span>
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <a href="https://www.pharmacyregulation.org/registers" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4">
            GPhC register
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
          <a href="https://www.psni.org.uk/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4">
            PSNI register
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      </section>

      <section className="mt-14 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border p-6 sm:p-8">
        <div>
          <h2 className="text-xl font-semibold">Check the evidence before you compare prices</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">Every pharmacy profile in the directory carries this same evidence trail.</p>
        </div>
        <Button
          size="lg"
          className="rounded-full px-6"
          nativeButton={false}
          render={
            <Link href="/ed/pharmacies" className="inline-flex items-center gap-2">
              Browse the directory
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          }
        />
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold">Common questions</h2>
        <div className="mt-5 divide-y divide-border rounded-2xl border border-border">
          {FAQS.map((item) => (
            <details key={item.q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold">More in {groupLabels.trust}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {relatedTrustPages.map((entry) => (
            <Link key={entry.path} href={edHref(entry.path)} className="rounded-2xl border border-border p-5 hover:bg-muted">
              <span className="block text-xs text-muted-foreground">{entry.readable ? "Available now" : "Coming soon"}</span>
              <span className="mt-1 block font-medium">{entry.title}</span>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
