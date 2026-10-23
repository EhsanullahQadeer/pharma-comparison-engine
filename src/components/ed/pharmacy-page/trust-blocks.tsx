import { Check, ChevronDown, ExternalLink, FileCheck2, Flag, Info, MapPin, ShieldCheck } from "lucide-react";

import Link from "@/components/Link";
import { formatShortDate } from "@/lib/comparison";
import { cn } from "@/lib/utils";
import type { PharmacyPageModel } from "@/types/pharmacy-page";

// Trust/information blocks of the pharmacy profile. The side panel's cards share one compact
// style; every block renders its own heading.

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const panel = "rounded-2xl border border-border bg-card p-5";
const panelHeading = "flex items-center gap-2 text-base font-semibold";

export function KeyFacts({ model, className }: { model: PharmacyPageModel; className?: string }) {
  return (
    <section aria-labelledby="key-facts" className={cn(panel, className)}>
      <h2 id="key-facts" className={panelHeading}>At a glance</h2>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed">
        {model.keyFacts.map((fact) => (
          <li key={fact} className="flex gap-2.5"><Check aria-hidden="true" className="mt-1 size-3.5 shrink-0 text-primary" />{fact}</li>
        ))}
      </ul>
    </section>
  );
}

export function RegistrationChecks({ model, className }: { model: PharmacyPageModel; className?: string }) {
  const { provider } = model;
  return (
    <section aria-labelledby="checks" className={cn(panel, "scroll-mt-28", className)}>
      <h2 id="checks" className={panelHeading}><ShieldCheck aria-hidden="true" className="size-4 text-primary" />Registration</h2>
      <dl className="mt-3 space-y-2 text-sm">
        {provider.legalName !== provider.name ? <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Operated by</dt><dd className="text-right font-medium">{provider.legalName}</dd></div> : null}
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Regulator</dt><dd className="text-right font-medium">{model.regulatorLabel}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Number</dt><dd className="font-medium tabular-nums">{provider.regulatorReference}</dd></div>
        {provider.dispensingPartnerName ? <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Dispensed by</dt><dd className="text-right font-medium">{provider.dispensingPartnerName}</dd></div> : null}
        {provider.serviceRegions.length > 0 && (
          <div>
            <dt className="text-muted-foreground">Delivers to</dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">{provider.serviceRegions.map((region) => <span key={region} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs"><MapPin aria-hidden="true" className="size-3" />{region}</span>)}</dd>
          </div>
        )}
      </dl>
      <a href={model.registerUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4 hover:text-muted-foreground">
        Check the live register<ExternalLink aria-hidden="true" className="size-3.5" />
      </a>
      {provider.evidence.length > 0 && (
        <details className="group mt-4 border-t border-border pt-3 text-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-medium [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2"><FileCheck2 aria-hidden="true" className="size-4 text-primary" />Checked evidence ({provider.evidence.length})</span>
            <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="mt-2 space-y-1.5">
            {provider.evidence.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3">
                <a href={item.sourceUrl} target="_blank" rel="nofollow noopener noreferrer" className="min-w-0 truncate underline underline-offset-4 hover:text-muted-foreground">{hostname(item.sourceUrl)}</a>
                {item.checkedAt ? <time dateTime={item.checkedAt.toISOString()} className="shrink-0 text-xs text-muted-foreground">{formatShortDate(item.checkedAt)}</time> : null}
              </li>
            ))}
          </ul>
          <Link href="/ed/trust/pharmacy-evidence" className="mt-2 inline-block text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">What we check, and what it doesn&apos;t tell you</Link>
        </details>
      )}
    </section>
  );
}

export function FullCostChecklist({ model, className }: { model: PharmacyPageModel; className?: string }) {
  return (
    <section aria-labelledby="full-cost" className={cn(panel, "scroll-mt-28", className)}>
      <h2 id="full-cost" className={panelHeading}>Before you order</h2>
      <p className="mt-2 text-sm text-muted-foreground">{model.deliveryText}</p>
      <ul className="mt-3 space-y-2.5 text-sm">
        {model.checklist.map((item) => (
          <li key={item.title} className="flex gap-2.5">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="leading-relaxed"><span className="font-medium">{item.title}.</span> <span className="text-muted-foreground">{item.body}</span></p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Native <details> accordion — works without JavaScript and keeps every answer in the HTML (the
// page's FAQPage structured data mirrors it word for word).
export function FaqList({ model, className }: { model: PharmacyPageModel; className?: string }) {
  return (
    <section aria-labelledby="faq" className={cn("scroll-mt-28", className)}>
      <h2 id="faq" className="text-xl font-semibold tracking-tight">Common questions about {model.provider.name}</h2>
      <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {model.faqs.map((faq) => (
          <details key={faq.id} className="group px-4 py-3 open:bg-muted/40">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <h3>{faq.question}</h3>
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function IndependenceNote({ model, className }: { model: PharmacyPageModel; className?: string }) {
  const { provider, partner } = model;
  return (
    <aside aria-label="About this page" className={cn("flex gap-2.5 rounded-2xl bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground", className)}>
      <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <p>
        Independent information: we don&apos;t prescribe or sell medicine. {provider.name} sets its own prices and makes all clinical decisions.{" "}
        {partner ? "We may earn commission if you order through our link; it never changes the order prices are shown in." : "We have no commercial relationship with this pharmacy."}{" "}
        <Link href="/ed/independence" className="underline underline-offset-4 hover:text-foreground">How we&apos;re funded</Link>
      </p>
    </aside>
  );
}

export function CorrectionPrompt({ model, className }: { model: PharmacyPageModel; className?: string }) {
  return (
    <section aria-labelledby="correction" className={cn("rounded-2xl border border-dashed border-border p-4", className)}>
      <h2 id="correction" className="flex items-center gap-2 text-sm font-semibold"><Flag aria-hidden="true" className="size-3.5" />Spotted something wrong?</h2>
      <p className="mt-1 text-sm text-muted-foreground">Tell us if a price or detail is out of date and we&apos;ll re-check it.</p>
      <Link href={`/ed/pharmacies/claim?pharmacy=${model.provider.slug}`} className="mt-2 inline-block text-sm font-medium underline underline-offset-4">Request a correction</Link>
    </section>
  );
}
