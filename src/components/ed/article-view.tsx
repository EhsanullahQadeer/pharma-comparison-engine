import { BookOpen, CircleAlert, FileSearch, Lightbulb } from "lucide-react";

import { ArticleMarkdown } from "@/components/ed/article-markdown";
import { PageShell } from "@/components/ed/page-shell";
import Link from "@/components/Link";
import { formatShortDate } from "@/lib/comparison";
import { edHref, edPages, groupLabels } from "@/lib/ed-pages";
import type { EdPage } from "@/lib/ed-pages";
import { revealClass, revealStyle } from "@/lib/motion";
import { parseSource } from "@/lib/trusted-sources";
import type { ArticleContent } from "@/types/article";

const hubByGroup: Partial<Record<EdPage["group"], { href: string; label: string }>> = {
  guides: { href: "/ed/guides", label: "Guides" },
  "side-effects": { href: "/ed/guides/safety", label: "Safety" },
  tools: { href: "/ed/tools", label: "Tools" },
};

// `checkedOn` is the date the article was last checked against the sources it lists.
export function ArticleView({ page, article, checkedOn }: { page: EdPage; article: Omit<ArticleContent, "slug">; checkedOn: Date }) {
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
        <span className="inline-flex items-center gap-1.5">
          <FileSearch aria-hidden="true" className="size-4 text-primary" />
          Every statement checked against the numbered sources below on <time dateTime={checkedOn.toISOString()}>{formatShortDate(checkedOn)}</time>
        </span>
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
