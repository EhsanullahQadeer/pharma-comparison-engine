import { BadgeCheck, BookOpen, CircleAlert, FileSearch, Lightbulb } from "lucide-react";

import { ArticleMarkdown } from "@/components/ed/article-markdown";
import { PageShell } from "@/components/ed/page-shell";
import Link from "@/components/Link";
import { formatShortDate } from "@/lib/comparison";
import { edHref, edPages, groupLabels } from "@/lib/ed-pages";
import type { EdPage } from "@/lib/ed-pages";
import { revealClass, revealStyle } from "@/lib/motion";
import type { ArticleContent, ArticleVetting } from "@/types/article";

// Sources are stored one per line as "Title — https://…" (or a bare URL).
function parseSource(source: string) {
  const match = source.match(/^(.*?)\s*[—–-]\s*(https?:\/\/\S+)$/);
  if (match) return { label: match[1], url: match[2] };
  return source.startsWith("http") ? { label: source, url: source } : { label: source, url: null };
}

const hubByGroup: Partial<Record<EdPage["group"], { href: string; label: string }>> = {
  guides: { href: "/ed/guides", label: "Guides" },
  "side-effects": { href: "/ed/guides/safety", label: "Safety" },
  tools: { href: "/ed/tools", label: "Tools" },
};

function ReviewedByline({ vetting }: { vetting: Extract<ArticleVetting, { kind: "reviewed" }> }) {
  return (
    <>
      <span>Written by <span className="font-medium text-foreground">{vetting.authorName}</span></span>
      {vetting.reviewerName && vetting.reviewedAt ? (
        <span className="inline-flex items-center gap-1.5">
          <BadgeCheck aria-hidden="true" className="size-4 text-primary" />
          Clinically reviewed by <span className="font-medium text-foreground">{vetting.reviewerName}</span> on <time dateTime={vetting.reviewedAt.toISOString()}>{formatShortDate(vetting.reviewedAt)}</time>
        </span>
      ) : null}
      <span>Revision {vetting.revision}</span>
    </>
  );
}

// Source-checked content that no named clinician has reviewed yet — said plainly, never implied.
function SourcedByline({ vetting }: { vetting: Extract<ArticleVetting, { kind: "sourced" }> }) {
  return (
    <>
      <span className="inline-flex items-center gap-1.5">
        <FileSearch aria-hidden="true" className="size-4 text-primary" />
        Every statement checked against the numbered sources below on <time dateTime={vetting.checkedOn.toISOString()}>{formatShortDate(vetting.checkedOn)}</time>
      </span>
      <span>Awaiting review by a named clinician</span>
    </>
  );
}

export function ArticleView({ page, article, vetting }: { page: EdPage; article: Omit<ArticleContent, "slug">; vetting: ArticleVetting }) {
  const hub = hubByGroup[page.group];
  const related = edPages.filter((entry) => entry.group === page.group && entry.path !== page.path && entry.kind === "article").slice(0, 3);

  return (
    <PageShell
      title={article.title}
      eyebrow={`${groupLabels[page.group]} / ${page.section}`}
      description={article.summary}
      crumbs={[{ label: "Home", href: "/" }, ...(hub ? [hub] : [])]}
    >
      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-border py-4 text-sm text-muted-foreground">
        {vetting.kind === "reviewed" ? <ReviewedByline vetting={vetting} /> : <SourcedByline vetting={vetting} />}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_18rem]">
        <article className="min-w-0 max-w-3xl">
          {article.keyFacts.length > 0 ? (
            <section aria-labelledby="key-facts-heading" className={`rounded-3xl border border-primary/40 bg-primary/10 p-6 ${revealClass}`}>
              <h2 id="key-facts-heading" className="flex items-center gap-2 font-semibold"><Lightbulb aria-hidden="true" className="size-4" />Key facts</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {article.keyFacts.map((fact) => <li key={fact} className="flex gap-2"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />{fact}</li>)}
              </ul>
            </section>
          ) : null}
          <div className={revealClass} style={revealStyle(2)}>
            <ArticleMarkdown>{article.body}</ArticleMarkdown>
          </div>
          <section aria-labelledby="sources-heading" className="mt-14 border-t border-border pt-8">
            <h2 id="sources-heading" className="flex items-center gap-2 text-lg font-semibold"><BookOpen aria-hidden="true" className="size-4" />Sources</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-6 text-sm text-muted-foreground">
              {article.sources.map((source, index) => {
                const { label, url } = parseSource(source);
                return <li key={source} id={`source-${index + 1}`} className="scroll-mt-40 target:text-foreground">{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">{label}</a> : label}</li>;
              })}
            </ol>
          </section>
        </article>

        <aside className="space-y-5 lg:sticky lg:top-40 lg:self-start">
          <div className="rounded-3xl border border-border bg-card p-5 text-sm">
            <p className="flex items-center gap-2 font-semibold"><CircleAlert aria-hidden="true" className="size-4 text-destructive" />Need help now?</p>
            <p className="mt-2 leading-relaxed text-muted-foreground">This is general information, not medical advice. For an erection lasting more than 3 to 4 hours, chest pain, or sudden loss of vision or hearing, call 999 or go to A&amp;E. For other urgent concerns, call NHS 111.</p>
          </div>
          {related.length > 0 ? (
            <nav aria-label="Related reading" className="rounded-3xl border border-border p-5 text-sm">
              <p className="font-semibold">Related reading</p>
              <ul className="mt-3 space-y-2">
                {related.map((entry) => <li key={entry.path}><Link href={edHref(entry.path)} className="underline-offset-4 hover:underline">{entry.title}</Link></li>)}
              </ul>
            </nav>
          ) : null}
          <p className="px-1 text-xs text-muted-foreground">Spotted a mistake? <Link href="/ed/contact" className="underline underline-offset-4">Tell us</Link> and we&apos;ll review it.</p>
        </aside>
      </div>
    </PageShell>
  );
}
