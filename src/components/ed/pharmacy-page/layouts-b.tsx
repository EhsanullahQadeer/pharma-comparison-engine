import { GradientText } from "@/components/ed/gradient-text";
import { PharmacyAvatar } from "@/components/ed/pharmacy-avatar";
import { CheckedStamp, Eyebrow, LogoTile, PharmacyCrumbs, StatStrip } from "@/components/ed/pharmacy-page/hero-blocks";
import { pageContainer } from "@/components/ed/pharmacy-page/layouts-a";
import { BestOfferCard, DiscountList, PricesBlock, VisitAction } from "@/components/ed/pharmacy-page/offer-blocks";
import { CorrectionPrompt, FaqList, FullCostChecklist, HowItWorks, IndependenceNote, KeyFacts, QuickAnswer, RegistrationChecks } from "@/components/ed/pharmacy-page/trust-blocks";
import { formatPence } from "@/lib/money";
import { revealClass } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { PharmacyPageModel } from "@/types/pharmacy-page";

import type { ReactNode } from "react";

// Pharmacy profile layouts 6–10. Same content blocks, different arrangement and emphasis.

function Stage({ number, label, last = false, children }: { number: number; label: string; last?: boolean; children: ReactNode }) {
  return (
    <div className="relative grid gap-4 sm:grid-cols-[4rem_1fr] sm:gap-6">
      <div className="flex items-center gap-3 sm:flex-col sm:items-center">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-foreground text-lg font-semibold text-background tabular-nums">{number}</span>
        {!last && <span aria-hidden="true" className="hidden w-0.5 flex-1 bg-border sm:block" />}
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase sm:hidden">{label}</p>
      </div>
      <div className="min-w-0 pb-14">
        <p className="mb-4 hidden text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase sm:block">{label}</p>
        {children}
      </div>
    </div>
  );
}

// 6 · Timeline — the page walks through the order a careful buyer would check things in.
export function TimelineLayout({ model }: { model: PharmacyPageModel }) {
  const { provider } = model;
  return (
    <div className={pageContainer}>
      <PharmacyCrumbs name={provider.name} />
      <header className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className={revealClass}>
          <div className="flex items-center gap-4">
            <PharmacyAvatar name={provider.name} logoUrl={provider.logoUrl} size="lg" />
            <Eyebrow>Step-by-step pharmacy check</Eyebrow>
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Ordering from {provider.name}? Check these four things first</h1>
          <CheckedStamp model={model} className="mt-5" />
        </div>
        <VisitAction model={model} />
      </header>
      <div className="mt-12">
        <Stage number={1} label="Is it a registered pharmacy?"><RegistrationChecks model={model} /></Stage>
        <Stage number={2} label="What does it charge?"><PricesBlock model={model} className="-mt-10" /></Stage>
        <Stage number={3} label="Is there an offer?">
          <BestOfferCard model={model} tone="dark" />
          <DiscountList model={model} className="mt-10" />
        </Stage>
        <Stage number={4} label="What will I actually pay?" last><FullCostChecklist model={model} /></Stage>
      </div>
      <FaqList model={model} className="mt-4" />
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <IndependenceNote model={model} />
        <CorrectionPrompt model={model} />
      </div>
    </div>
  );
}

// 7 · Magazine — big editorial headline, a pull-quote price, facts and prose side by side.
export function MagazineLayout({ model }: { model: PharmacyPageModel }) {
  const { provider, bestOffer } = model;
  return (
    <div className={pageContainer}>
      <PharmacyCrumbs name={provider.name} />
      <header className={`mt-10 border-b border-border pb-10 text-center ${revealClass}`}>
        <p className="text-sm font-semibold tracking-[0.3em] text-muted-foreground uppercase">The pharmacy file</p>
        <h1 className="mx-auto mt-5 max-w-4xl text-5xl font-semibold tracking-tighter text-balance sm:text-7xl"><GradientText>{provider.name}</GradientText></h1>
        <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-muted-foreground">Offers, discount codes and the prices we&apos;ve checked, in one place.</p>
      </header>
      <div className="mt-12 grid gap-10 lg:grid-cols-[16rem_1fr]">
        <div className="space-y-6">
          <LogoTile model={model} />
          {bestOffer ? (
            <blockquote className="border-l-4 border-primary pl-5">
              <p className="text-5xl font-semibold tracking-tight tabular-nums">{formatPence(bestOffer.perTabletPence)}</p>
              <p className="mt-1 text-sm text-muted-foreground">lowest price per tablet we&apos;ve checked</p>
            </blockquote>
          ) : null}
          <CheckedStamp model={model} className="text-xs" />
        </div>
        <div className="min-w-0 space-y-12">
          <KeyFacts model={model} />
          <div className="grid gap-8 lg:grid-cols-2">
            <HowItWorks model={model} />
            <div className="self-start rounded-3xl bg-muted/60 p-6">
              <p className="text-sm font-semibold">Ready to check the current offer?</p>
              <p className="mt-1 text-sm text-muted-foreground">Open {provider.name} to see its current price and terms.</p>
              <VisitAction model={model} className="mt-5" />
            </div>
          </div>
          <DiscountList model={model} />
        </div>
      </div>
      <PricesBlock model={model} />
      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        <FaqList model={model} />
        <div className="space-y-6">
          <RegistrationChecks model={model} />
          <FullCostChecklist model={model} />
        </div>
      </div>
      <IndependenceNote model={model} className="mt-10" />
      <CorrectionPrompt model={model} className="mt-4" />
    </div>
  );
}

// 8 · Minimal — one narrow column, typographic, hairline dividers, no decoration.
export function MinimalLayout({ model }: { model: PharmacyPageModel }) {
  const { provider } = model;
  const divider = "border-t border-border pt-12";
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <PharmacyCrumbs name={provider.name} />
      <header className="mt-12">
        <PharmacyAvatar name={provider.name} logoUrl={provider.logoUrl} size="md" />
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance">{provider.name} discount codes and prices</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{provider.websiteDomain} · {model.regulatorLabel} {provider.regulatorReference}</p>
        <CheckedStamp model={model} className="mt-4" />
      </header>
      <div className="mt-12 space-y-12">
        <QuickAnswer model={model} className="border-none bg-transparent p-0 shadow-none" />
        <div className={divider}><DiscountList model={model} /></div>
        <div className={divider}><BestOfferCard model={model} tone="light" className="shadow-none" /></div>
        <div className={cn(divider, "[&>div>section]:mt-0")}><PricesBlock model={model} /></div>
        <div className={divider}><HowItWorks model={model} style="timeline" /></div>
        <div className={divider}><RegistrationChecks model={model} className="border-none bg-transparent p-0" /></div>
        <div className={divider}><FullCostChecklist model={model} /></div>
        <div className={divider}><FaqList model={model} /></div>
        <IndependenceNote model={model} />
        <CorrectionPrompt model={model} />
      </div>
    </div>
  );
}

// 9 · Banner — a full-width contrast banner with the numbers, then cards overlapping it.
export function BannerLayout({ model }: { model: PharmacyPageModel }) {
  const { provider } = model;
  return (
    <div>
      <div className="bg-foreground text-background">
        <div className="mx-auto w-full max-w-6xl px-4 pt-10 pb-28 sm:px-6 sm:pt-14">
          <PharmacyCrumbs name={provider.name} className="text-background/70 [&_a:hover]:text-background [&_[aria-current]]:text-background" />
          <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center">
            <PharmacyAvatar name={provider.name} logoUrl={provider.logoUrl} size="xl" />
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.18em] text-background/60 uppercase">Offers · Prices · Checks</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{provider.name} discounts</h1>
              <p className="mt-3 text-background/70">{provider.websiteDomain} · Registered with the {model.regulatorLabel}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto -mt-20 w-full max-w-6xl px-4 pb-14 sm:px-6">
        <StatStrip model={model} variant="strip" className="shadow-(--shadow)" />
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <QuickAnswer model={model} />
          <BestOfferCard model={model} tone="light" className="lg:col-span-2" />
        </div>
        <DiscountList model={model} style="tickets" className="mt-14" />
        <HowItWorks model={model} style="inline" className="mt-14" />
        <PricesBlock model={model} />
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <RegistrationChecks model={model} />
          <FullCostChecklist model={model} />
        </div>
        <FaqList model={model} className="mt-14" />
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <IndependenceNote model={model} />
          <CorrectionPrompt model={model} />
        </div>
      </div>
    </div>
  );
}

// 10 · Prices first — a compact header, then the full price table straight away.
export function PricesFirstLayout({ model }: { model: PharmacyPageModel }) {
  const { provider } = model;
  return (
    <div className={pageContainer}>
      <PharmacyCrumbs name={provider.name} />
      <header className="mt-6 flex flex-col gap-5 rounded-3xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <PharmacyAvatar name={provider.name} logoUrl={provider.logoUrl} />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{provider.name} prices and discount codes</h1>
            <CheckedStamp model={model} className="mt-1 text-xs" />
          </div>
        </div>
        <VisitAction model={model} />
      </header>
      <PricesBlock model={model} layout="table" />
      <div className="mt-14 grid gap-8 lg:grid-cols-3">
        <DiscountList model={model} className="lg:col-span-2" />
        <QuickAnswer model={model} className="self-start" />
      </div>
      <BestOfferCard model={model} tone="dark" className="mt-14" />
      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        <RegistrationChecks model={model} />
        <div className="space-y-10">
          <HowItWorks model={model} />
          <FullCostChecklist model={model} />
        </div>
      </div>
      <FaqList model={model} className="mt-14" />
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <IndependenceNote model={model} />
        <CorrectionPrompt model={model} />
      </div>
    </div>
  );
}
