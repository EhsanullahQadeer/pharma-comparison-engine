import { ArrowRight } from "lucide-react";

import { GradientText } from "@/components/ed/gradient-text";
import { PharmacyAvatar } from "@/components/ed/pharmacy-avatar";
import { CheckedStamp, Eyebrow, LogoTile, PharmacyCrumbs, StatStrip, TableOfContents } from "@/components/ed/pharmacy-page/hero-blocks";
import { BestOfferCard, DiscountList, PricesBlock, VisitAction } from "@/components/ed/pharmacy-page/offer-blocks";
import { CorrectionPrompt, FaqList, FullCostChecklist, HowItWorks, IndependenceNote, KeyFacts, QuickAnswer, RegistrationChecks } from "@/components/ed/pharmacy-page/trust-blocks";
import Link from "@/components/Link";
import { formatShortDate } from "@/lib/comparison";
import { formatPence } from "@/lib/money";
import { revealClass } from "@/lib/motion";
import type { PharmacyPageModel } from "@/types/pharmacy-page";

// Pharmacy profile layouts 1–5. Same content blocks, different arrangement and emphasis.

export const pageContainer = "mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14";

function intro(model: PharmacyPageModel) {
  return `Looking for a ${model.provider.name} discount code? This page shows every checked offer on record, the current prices we hold and the pharmacy's registration details.`;
}

// 1 · Spotlight — monj-style: hero with a logo card, quick answer, dark offer card beside the steps.
export function SpotlightLayout({ model }: { model: PharmacyPageModel }) {
  const { provider } = model;
  return (
    <div className={pageContainer}>
      <PharmacyCrumbs name={provider.name} />
      <div className="relative mt-6 overflow-hidden rounded-4xl border border-border bg-linear-to-br from-card via-card to-primary/10 p-6 sm:p-12">
        <span aria-hidden="true" className="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full border-[40px] border-foreground/5" />
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_20rem]">
          <div className={revealClass}>
            <Eyebrow>Independently checked</Eyebrow>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{provider.name} <GradientText>discount codes</GradientText></h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{intro(model)}</p>
            <CheckedStamp model={model} className="mt-6" />
          </div>
          <LogoTile model={model} className="min-h-56" />
        </div>
      </div>
      <QuickAnswer model={model} className="relative z-10 mx-auto -mt-6 max-w-5xl" />
      <div className="mt-10 grid gap-6 lg:grid-cols-5">
        <BestOfferCard model={model} tone="dark" className="lg:col-span-3" />
        <HowItWorks model={model} className="rounded-4xl border border-border bg-card p-7 lg:col-span-2" />
      </div>
      <DiscountList model={model} className="mt-14" />
      <RegistrationChecks model={model} className="mt-14" />
      <PricesBlock model={model} />
      <FullCostChecklist model={model} columns={2} className="mt-14" />
      <FaqList model={model} className="mt-14" />
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <IndependenceNote model={model} />
        <CorrectionPrompt model={model} />
      </div>
    </div>
  );
}

// 2 · Guide — monj-style editorial guide: key facts first, sticky "on this page" sidebar.
export function GuideLayout({ model }: { model: PharmacyPageModel }) {
  const { provider } = model;
  const chips = [
    model.latestCheckAt ? `Last checked ${formatShortDate(model.latestCheckAt)}` : "Prices being checked",
    `${model.regulatorLabel} registered`,
    `Independent of ${provider.name}`,
  ];
  return (
    <div className={pageContainer}>
      <PharmacyCrumbs name={provider.name} />
      <header className="mt-6 rounded-4xl bg-linear-to-br from-primary/10 via-card to-muted p-6 sm:p-10">
        <span className="inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold tracking-wider uppercase">Pharmacy guide</span>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{provider.name}: prices, discounts and how it compares</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">{intro(model)} Every figure comes from {provider.websiteDomain} and shows when we last checked it.</p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {chips.map((chip) => <li key={chip} className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground">{chip}</li>)}
        </ul>
      </header>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0 space-y-14">
          <KeyFacts model={model} />
          <DiscountList model={model} title={`${provider.name} discounts`} />
          <PricesBlock model={model} className="-mt-10" />
          <RegistrationChecks model={model} />
          <FullCostChecklist model={model} />
          <FaqList model={model} title="Common questions" />
          <IndependenceNote model={model} />
        </div>
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <TableOfContents />
          <div className="rounded-3xl border border-border bg-card p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">See {provider.name} beside every pharmacy</p>
            <p className="mt-2 text-sm text-muted-foreground">Checkout totals for every strength and pack, ordered by lowest price.</p>
            <Link href="/ed/compare" className="mt-4 flex items-center justify-between rounded-2xl bg-foreground px-4 py-3 font-semibold text-background transition-opacity hover:opacity-90">Compare prices<ArrowRight aria-hidden="true" className="size-4" /></Link>
          </div>
          <VisitAction model={model} tone="outline" full />
          <CorrectionPrompt model={model} />
        </aside>
      </div>
    </div>
  );
}

// 3 · Sticky card — a pinned pharmacy card on the left, the story scrolling on the right.
export function StickyCardLayout({ model }: { model: PharmacyPageModel }) {
  const { provider, bestOffer } = model;
  return (
    <div className={pageContainer}>
      <PharmacyCrumbs name={provider.name} />
      <div className="mt-8 grid gap-10 lg:grid-cols-[20rem_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-4xl border border-border bg-card shadow-(--shadow)">
            <div className="flex flex-col items-center gap-3 bg-linear-to-b from-primary/15 to-transparent p-8 text-center">
              <PharmacyAvatar name={provider.name} logoUrl={provider.logoUrl} size="xl" />
              <p className="text-lg font-semibold">{provider.name}</p>
              <p className="text-sm text-muted-foreground">{provider.websiteDomain}</p>
            </div>
            <div className="space-y-5 p-6">
              {bestOffer ? <p className="text-center"><span className="text-4xl font-semibold tabular-nums">{formatPence(bestOffer.perTabletPence)}</span><span className="text-muted-foreground"> / tablet</span></p> : null}
              <VisitAction model={model} full />
              <dl className="space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Regulator</dt><dd className="text-right font-medium">{model.regulatorLabel}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Reference</dt><dd className="font-medium tabular-nums">{provider.regulatorReference}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Discounts</dt><dd className="font-medium">{model.discounts.length}</dd></div>
              </dl>
              <CheckedStamp model={model} className="text-xs" />
            </div>
          </div>
        </aside>
        <div className="min-w-0">
          <Eyebrow>Pharmacy profile</Eyebrow>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{provider.name} offers and prices</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">{intro(model)}</p>
          <StatStrip model={model} variant="strip" className="mt-8" />
          <DiscountList model={model} style="tickets" className="mt-12" />
          <HowItWorks model={model} style="inline" className="mt-12" />
          <PricesBlock model={model} />
          <RegistrationChecks model={model} className="mt-12" />
          <FullCostChecklist model={model} className="mt-12" />
          <FaqList model={model} className="mt-12" />
          <IndependenceNote model={model} className="mt-10" />
          <CorrectionPrompt model={model} className="mt-4" />
        </div>
      </div>
    </div>
  );
}

// 4 · Dashboard — numbers first, then a bento grid of offer, answer and checks.
export function DashboardLayout({ model }: { model: PharmacyPageModel }) {
  const { provider } = model;
  return (
    <div className={pageContainer}>
      <PharmacyCrumbs name={provider.name} />
      <header className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <PharmacyAvatar name={provider.name} logoUrl={provider.logoUrl} size="lg" />
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{provider.name}</h1>
            <p className="mt-1 text-muted-foreground">Discounts, prices and registration at a glance</p>
          </div>
        </div>
        <VisitAction model={model} />
      </header>
      <StatStrip model={model} className="mt-8" />
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <BestOfferCard model={model} tone="light" className="lg:col-span-2" />
        <div className="space-y-6">
          <QuickAnswer model={model} />
          <CheckedStamp model={model} className="rounded-3xl border border-border bg-card p-5" />
        </div>
      </div>
      <DiscountList model={model} style="tickets" className="mt-12" />
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <RegistrationChecks model={model} />
        <FullCostChecklist model={model} className="rounded-3xl border border-border p-6 sm:p-8" />
      </div>
      <PricesBlock model={model} layout="table" />
      <FaqList model={model} className="mt-12" />
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <IndependenceNote model={model} />
        <CorrectionPrompt model={model} />
      </div>
    </div>
  );
}

// 5 · Coupon — centred hero, discount "tickets" up top, a bright offer card, then the detail.
export function CouponLayout({ model }: { model: PharmacyPageModel }) {
  const { provider } = model;
  return (
    <div className={pageContainer}>
      <PharmacyCrumbs name={provider.name} className="justify-center" />
      <header className={`mx-auto mt-10 flex max-w-3xl flex-col items-center text-center ${revealClass}`}>
        <PharmacyAvatar name={provider.name} logoUrl={provider.logoUrl} size="xl" />
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">{provider.name} <GradientText>codes &amp; offers</GradientText></h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{intro(model)}</p>
        <CheckedStamp model={model} className="mt-5 justify-center" />
      </header>
      <DiscountList model={model} style="tickets" title="Current codes and offers" className="mx-auto mt-12 max-w-4xl" />
      <BestOfferCard model={model} tone="primary" className="mx-auto mt-10 max-w-4xl" />
      <HowItWorks model={model} style="inline" className="mt-14" />
      <PricesBlock model={model} />
      <FullCostChecklist model={model} columns={2} className="mt-14" />
      <RegistrationChecks model={model} className="mt-14" />
      <FaqList model={model} className="mx-auto mt-14 max-w-4xl" />
      <IndependenceNote model={model} className="mx-auto mt-10 max-w-4xl" />
      <CorrectionPrompt model={model} className="mx-auto mt-4 max-w-4xl" />
    </div>
  );
}
