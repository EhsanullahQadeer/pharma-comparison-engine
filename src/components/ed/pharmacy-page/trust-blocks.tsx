import { Check, ChevronDown, ExternalLink, FileCheck2, Flag, Info, MapPin, ShieldCheck } from "lucide-react";

import Link from "@/components/Link";
import { formatShortDate } from "@/lib/comparison";
import { revealClass, revealStyle } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { PharmacyPageModel, PharmacyStep } from "@/types/pharmacy-page";

// Trust/information building blocks shared by the ten pharmacy profile layouts. Every block
// renders its own <h2>; layouts only arrange and restyle them.

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function QuickAnswer({ model, className }: { model: PharmacyPageModel; className?: string }) {
  const { provider, discounts } = model;
  const answer = discounts.length > 0
    ? `We have ${discounts.length} checked discount${discounts.length === 1 ? "" : "s"} on record for ${provider.name}, shown below with any code to copy.`
    : `There's no checked discount code on record for ${provider.name}. The link below opens the pharmacy's own page so you can see its latest price and terms.`;
  return (
    <div className={cn("flex gap-4 rounded-3xl border border-border bg-card p-6 shadow-(--shadow)", className)}>
      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Check className="size-5" /></span>
      <div>
        <p className="text-lg font-semibold">Quick answer</p>
        <p className="mt-1 leading-relaxed text-muted-foreground">{answer}</p>
      </div>
    </div>
  );
}

export function KeyFacts({ model, className }: { model: PharmacyPageModel; className?: string }) {
  return (
    <section aria-labelledby="key-facts" className={cn("rounded-3xl border-l-4 border-primary bg-primary/10 p-6 sm:p-8", className)}>
      <h2 id="key-facts" className="text-xl font-semibold">Key facts</h2>
      <ul className="mt-4 space-y-3">
        {model.keyFacts.map((fact) => (
          <li key={fact} className="flex gap-3 leading-relaxed"><span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-foreground" />{fact}</li>
        ))}
      </ul>
    </section>
  );
}

type StepsStyle = "numbered" | "timeline" | "inline";

function StepItems({ steps, style }: { steps: PharmacyStep[]; style: StepsStyle }) {
  const layouts: Record<StepsStyle, string> = {
    numbered: "mt-5 space-y-5",
    timeline: "relative mt-6 space-y-8 border-l-2 border-border pl-8",
    inline: "mt-5 grid gap-4 sm:grid-cols-3",
  };
  return (
    <ol className={layouts[style]}>
      {steps.map((step, index) => (
        <li key={step.title} className={cn("relative flex gap-4", style === "inline" && "flex-col rounded-3xl border border-border bg-card p-5", revealClass)} style={revealStyle(index)}>
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-sm font-semibold text-background tabular-nums", style === "timeline" && "absolute top-0 -left-[3.2rem] rounded-full ring-4 ring-background")}>{index + 1}</span>
          <div>
            <h3 className="font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function HowItWorks({ model, style = "numbered", className }: { model: PharmacyPageModel; style?: StepsStyle; className?: string }) {
  return (
    <section aria-labelledby="how-it-works" className={className}>
      <h2 id="how-it-works" className="text-2xl font-semibold tracking-tight">How it works</h2>
      <StepItems steps={model.steps} style={style} />
    </section>
  );
}

export function RegistrationChecks({ model, className }: { model: PharmacyPageModel; className?: string }) {
  const { provider } = model;
  return (
    <section aria-labelledby="checks" className={cn("scroll-mt-24 rounded-3xl border border-border bg-card p-6 sm:p-8", className)}>
      <h2 id="checks" className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><ShieldCheck aria-hidden="true" className="size-6 text-primary" />{provider.name} checks</h2>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        {provider.legalName !== provider.name ? `${provider.name} is operated by ${provider.legalName}. ` : ""}It is listed on the {model.regulatorLabel} register under reference {provider.regulatorReference}. Check the live record rather than relying on a badge alone.
      </p>
      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">Regulator</dt><dd className="font-medium">{model.regulatorLabel}</dd></div>
        <div><dt className="text-muted-foreground">Registration number</dt><dd className="font-medium tabular-nums">{provider.regulatorReference}</dd></div>
        {provider.dispensingPartnerName ? <div><dt className="text-muted-foreground">Dispensing pharmacy</dt><dd className="font-medium">{provider.dispensingPartnerName}</dd></div> : null}
        {provider.serviceRegions.length > 0 && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Delivers to</dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">{provider.serviceRegions.map((region) => <span key={region} className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs"><MapPin aria-hidden="true" className="size-3" />{region}</span>)}</dd>
          </div>
        )}
      </dl>
      <a href={model.registerUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4 hover:text-muted-foreground">
        Check the public register yourself<ExternalLink aria-hidden="true" className="size-3.5" />
      </a>
      {provider.evidence.length > 0 && (
        <div className="mt-8 border-t border-border pt-6">
          <h3 className="flex items-center gap-2 font-semibold"><FileCheck2 aria-hidden="true" className="size-4 text-primary" />Checked evidence</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {provider.evidence.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3">
                <a href={item.sourceUrl} target="_blank" rel="nofollow noopener noreferrer" className="min-w-0 truncate underline underline-offset-4 hover:text-muted-foreground">{hostname(item.sourceUrl)}</a>
                {item.checkedAt ? <time dateTime={item.checkedAt.toISOString()} className="shrink-0 text-xs text-muted-foreground">{formatShortDate(item.checkedAt)}</time> : null}
              </li>
            ))}
          </ul>
          <Link href="/ed/trust/pharmacy-evidence" className="mt-4 inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">What we check, and what it doesn&apos;t tell you</Link>
        </div>
      )}
    </section>
  );
}

export function FullCostChecklist({ model, columns = 1, className }: { model: PharmacyPageModel; columns?: 1 | 2; className?: string }) {
  return (
    <section aria-labelledby="full-cost" className={cn("scroll-mt-24", className)}>
      <h2 id="full-cost" className="text-2xl font-semibold tracking-tight">Check the full cost before ordering</h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">{model.provider.name}&apos;s prices and offers can change, so check the live price and delivery charge before you pay. {model.deliveryText}</p>
      <ul className={cn("mt-5 grid gap-3", columns === 2 && "sm:grid-cols-2")}>
        {model.checklist.map((item) => (
          <li key={item.title} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
            <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed"><span className="font-semibold">{item.title}:</span> <span className="text-muted-foreground">{item.body}</span></p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Native <details> accordion — works without JavaScript and keeps every answer in the HTML.
export function FaqList({ model, className, title }: { model: PharmacyPageModel; className?: string; title?: string }) {
  return (
    <section aria-labelledby="faq" className={cn("scroll-mt-24", className)}>
      <h2 id="faq" className="text-2xl font-semibold tracking-tight">{title ?? `${model.provider.name} discount code FAQs`}</h2>
      <div className="mt-5 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
        {model.faqs.map((faq) => (
          <details key={faq.id} className="group p-5 open:bg-muted/40">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
              <h3>{faq.question}</h3>
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 leading-relaxed text-muted-foreground">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function IndependenceNote({ model, className }: { model: PharmacyPageModel; className?: string }) {
  const { provider, partner } = model;
  return (
    <aside aria-label="About this page" className={cn("flex gap-3 rounded-3xl bg-muted/60 p-5 text-sm leading-relaxed text-muted-foreground", className)}>
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
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
    <section aria-labelledby="correction" className={cn("rounded-3xl border border-dashed border-border p-6", className)}>
      <h2 id="correction" className="flex items-center gap-2 font-semibold"><Flag aria-hidden="true" className="size-4" />Spotted something wrong?</h2>
      <p className="mt-2 text-sm text-muted-foreground">If a price, offer or detail here is out of date, let us know and we&apos;ll re-check it.</p>
      <Link href={`/ed/pharmacies/claim?pharmacy=${model.provider.slug}`} className="mt-4 inline-block text-sm font-medium underline underline-offset-4">Request a correction</Link>
    </section>
  );
}
