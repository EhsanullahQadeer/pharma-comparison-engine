import { ArrowLeft, ExternalLink } from "lucide-react";

import { getArticle, getArticles } from "@/actions/articles/articles";
import { ArticleEditor } from "@/components/admin/article-editor";
import { ArticlePublishActions } from "@/components/admin/article-publish-actions";
import { Badge } from "@/components/common/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import Link from "@/components/Link";
import { articleSlugOptions } from "@/lib/article-options";
import { formatShortDate } from "@/lib/comparison";
import { articleStatusBadgeVariant, articleStatusLabels } from "@/lib/content-labels";
import { edHref } from "@/lib/ed-pages";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit article", robots: { index: false, follow: false } };

export default async function EditArticlePage(props: PageProps<"/admin/articles/[id]">) {
  const { id } = await props.params;
  const [article, articles] = await Promise.all([getArticle(id), getArticles()]);
  const slugOptions = articleSlugOptions(articles.map((entry) => entry.slug), article.slug);

  return (
    <div className="space-y-4">
      <Link href="/admin/articles" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        Back to articles
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{article.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Written by {article.author.name} · revision {article.revision}
            {article.publishedAt ? ` · published on ${formatShortDate(article.publishedAt)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={articleStatusBadgeVariant[article.status]}>{articleStatusLabels[article.status]}</Badge>
          {article.active ? null : <Badge variant="outline">Inactive</Badge>}
          {article.status === "PUBLISHED" && article.active ? (
            <a href={edHref(article.slug)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm underline underline-offset-4">View live<ExternalLink aria-hidden="true" className="size-3.5" /></a>
          ) : null}
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Publishing</CardTitle></CardHeader>
        <CardContent>
          <ArticlePublishActions id={article.id} published={article.status === "PUBLISHED"} active={article.active} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Content</CardTitle></CardHeader>
        <CardContent>
          <ArticleEditor
            id={article.id}
            slugOptions={slugOptions}
            published={article.status === "PUBLISHED"}
            defaultValues={{ slug: article.slug, title: article.title, summary: article.summary, keyFacts: article.keyFacts.join("\n"), body: article.body, sources: article.sources.join("\n") }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
