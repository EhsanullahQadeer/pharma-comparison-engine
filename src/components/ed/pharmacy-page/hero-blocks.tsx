import { BadgeCheck, Clock3, Store, Tag, Wallet } from "lucide-react";

import { PharmacyAvatar } from "@/components/ed/pharmacy-avatar";
import Link from "@/components/Link";
import { formatCheckedAgo, formatShortDate } from "@/lib/comparison";
import { formatPence } from "@/lib/money";
import { revealClass, revealStyle } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { PharmacyPageModel } from "@/types/pharmacy-page";

import type { LucideIcon } from "lucide-react";

// Hero-area building blocks shared by the ten pharmacy profile layouts.

export function PharmacyCrumbs({ name, className }: { name: string; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex flex-wrap gap-2 text-sm text-muted-foreground", className)}>
      <Link href="/" className="hover:text-foreground hover:underline">Home</Link>
      <span aria-hidden="true">/</span>
      <Link href="/ed/pharmacies" className="hover:text-foreground hover:underline">Pharmacies</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page" className="text-foreground">{name}</span>
    </nav>
  );
}

export function Eyebrow({ children, className }: { children: string; className?: string }) {
  return (
    <p className={cn("flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase", className)}>
      <span aria-hidden="true" className="h-0.5 w-8 rounded-full bg-primary" />
      {children}
    </p>
  );
}

// The monj-style logo card: the pharmacy's own logo large on a plain tile, name underneath.
export function LogoTile({ model, className, showDomain = true }: { model: PharmacyPageModel; className?: string; showDomain?: boolean }) {
  const { provider } = model;
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-card p-8 text-center shadow-(--shadow)", className)}>
      <PharmacyAvatar name={provider.name} logoUrl={provider.logoUrl} size="xl" />
      <div>
        <p className="font-semibold">{provider.name}</p>
        {showDomain ? <p className="text-sm text-muted-foreground">{provider.websiteDomain}</p> : null}
      </div>
    </div>
  );
}

export function CheckedStamp({ model, className }: { model: PharmacyPageModel; className?: string }) {
  if (!model.latestCheckAt) return null;
  return (
    <p className={cn("inline-flex flex-wrap items-center gap-2 text-sm text-muted-foreground", className)}>
      <span aria-hidden="true" className="relative flex size-2.5">
        <span className="absolute inline-flex size-full rounded-full bg-primary opacity-60 motion-safe:animate-ping" />
        <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
      </span>
      <span className="font-medium text-foreground">Prices and registration checked</span>
      <time dateTime={model.latestCheckAt.toISOString()}>{formatCheckedAgo(model.latestCheckAt, model.now)} · {formatShortDate(model.latestCheckAt)}</time>
    </p>
  );
}

type Stat = { icon: LucideIcon; label: string; value: string };

function stats(model: PharmacyPageModel): Stat[] {
  return [
    { icon: Tag, label: "From, per tablet", value: model.bestOffer ? formatPence(model.bestOffer.perTabletPence) : "—" },
    { icon: Wallet, label: "Lowest total", value: model.lowestTotalPence !== null ? formatPence(model.lowestTotalPence) : "—" },
    { icon: Store, label: "Current prices", value: String(model.provider.offers.length) },
    { icon: BadgeCheck, label: "Discounts on record", value: String(model.discounts.length) },
    { icon: Clock3, label: "Last checked", value: model.latestCheckAt ? formatCheckedAgo(model.latestCheckAt, model.now) : "—" },
  ];
}

// Headline numbers as tiles ("tiles") or a single divided strip ("strip").
export function StatStrip({ model, variant = "tiles", className }: { model: PharmacyPageModel; variant?: "tiles" | "strip"; className?: string }) {
  const items = stats(model);
  if (variant === "strip") {
    return (
      <dl className={cn("grid grid-cols-2 divide-border overflow-hidden rounded-3xl border border-border bg-card sm:grid-cols-3 lg:grid-cols-5 lg:divide-x", className)}>
        {items.map(({ label, value }) => (
          <div key={label} className="p-4 sm:p-5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <dl className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5", className)}>
      {items.map(({ icon: Icon, label, value }, index) => (
        <div key={label} className={cn("rounded-2xl border border-border bg-card p-4 shadow-(--shadow)", revealClass)} style={revealStyle(index)}>
          <dt className="flex items-center gap-2 text-xs text-muted-foreground"><Icon aria-hidden="true" className="size-3.5" />{label}</dt>
          <dd className="mt-2 text-xl font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export const tocItems = [
  { href: "#offers", label: "Offers and discounts" },
  { href: "#prices", label: "Current prices" },
  { href: "#checks", label: "Registration checks" },
  { href: "#full-cost", label: "Check the full cost" },
  { href: "#faq", label: "Common questions" },
];

export function TableOfContents({ className }: { className?: string }) {
  return (
    <nav aria-label="On this page" className={cn("rounded-3xl border border-border bg-card p-5", className)}>
      <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">On this page</p>
      <ol className="mt-3 space-y-2 text-sm">
        {tocItems.map((item, index) => (
          <li key={item.href}>
            <a href={item.href} className="flex gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-muted hover:text-foreground">
              <span className="text-muted-foreground tabular-nums">{index + 1}.</span>
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
