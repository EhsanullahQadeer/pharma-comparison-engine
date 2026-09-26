import { ArrowRight, BadgeCheck, Clock3 } from "lucide-react";

import { getPublishedArticleSummaries } from "@/actions/articles/articles";
import { GradientText } from "@/components/ed/gradient-text";
import { PageShell } from "@/components/ed/page-shell";
import Link from "@/components/Link";
import { edHref, edPages } from "@/lib/ed-pages";
import type { EdPage } from "@/lib/ed-pages";
import { revealClass, revealStyle } from "@/lib/motion";
import { cn } from "@/lib/utils";

const hubPaths = new Set(["guides", "guides/safety", "tools"]);

type CardStatus = "readable" | "live" | "review";

function cardStatus(entry: EdPage, published: Map<string, string>): CardStatus {
  if (entry.live) return "live";
  return published.has(entry.path) ? "readable" : "review";
}

// Registry descriptions are internal scope notes, so unpublished articles get a neutral line instead.
function cardText(entry: EdPage, published: Map<string, string>) {
  if (entry.kind !== "article") return entry.description;
  return published.get(entry.path) ?? "Being written and checked by a clinical reviewer before it's published.";
}

const statusBadges: Record<CardStatus, { label: string; icon: typeof Clock3; className: string }> = {
  readable: { label: "Read now", icon: BadgeCheck, className: "bg-primary/15 text-foreground" },
  live: { label: "Live", icon: BadgeCheck, className: "bg-primary/15 text-foreground" },
  review: { label: "In clinical review", icon: Clock3, className: "bg-secondary text-secondary-foreground" },
};

// Topic hub (Guides, Safety, Tools): every page in its group, grouped by section, showing which are
// readable now and which are still going through clinical review.
export async function HubView({ group, title, accent, eyebrow, description }: {
  group: EdPage["group"];
  title: string;
  accent: string;
  eyebrow: string;
  description: string;
}) {
  const published = new Map((await getPublishedArticleSummaries()).map((article) => [article.slug, article.summary]));
  const pages = edPages.filter((entry) => entry.group === group && !hubPaths.has(entry.path));
  const sections = [...new Set(pages.map((entry) => entry.section))].map((section) => ({ section, pages: pages.filter((entry) => entry.section === section) }));
  const readableCount = pages.filter((entry) => entry.live || published.has(entry.path)).length;

  return (
    <PageShell
      title={title}
      heading={<>{title}, <GradientText>{accent}</GradientText></>}
      eyebrow={eyebrow}
      description={description}
      crumbs={[{ label: "Home", href: "/" }]}
      aside={(
        <div className="w-full rounded-3xl border border-border bg-card/80 p-5 shadow-(--shadow) backdrop-blur lg:w-72">
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{readableCount}<span className="text-base font-normal text-muted-foreground"> / {pages.length}</span></p>
          <p className="text-sm text-muted-foreground">pages available now</p>
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">Health information is published only after a named clinical reviewer has checked it against its sources.</p>
        </div>
      )}
    >
      {sections.map(({ section, pages: sectionPages }) => (
        <section key={section} aria-labelledby={`hub-${section}`} className="mt-12">
          <h2 id={`hub-${section}`} className="text-xl font-semibold">{section}</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sectionPages.map((entry) => {
              const status = cardStatus(entry, published);
              const badge = statusBadges[status];
              const Icon = badge.icon;
              return (
                <li key={entry.path} className={revealClass} style={revealStyle(pages.indexOf(entry))}>
                  <Link href={edHref(entry.path)} className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-(--shadow) transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-ring">
                    <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", badge.className)}><Icon aria-hidden="true" className="size-3.5" />{badge.label}</span>
                    <h3 className="mt-4 text-lg font-semibold">{entry.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{cardText(entry, published)}</p>
                    <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-medium">
                      {status === "review" ? "Preview" : "Open"}
                      <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </PageShell>
  );
}
