import { ArrowLeft, ExternalLink } from "lucide-react";

import { getArticle, getArticles } from "@/actions/articles/articles";
import { ArticleEditor } from "@/components/admin/article-editor";
import { ArticleReviewActions } from "@/components/admin/article-review-actions";
import { Badge } from "@/components/common/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import Link from "@/components/Link";
import { articleSlugOptions } from "@/lib/article-options";
import { formatShortDate } from "@/lib/comparison";
import { articleStatusBadgeVariant, articleStatusLabels } from "@/lib/content-labels";
import { edHref } from "@/lib/ed-pages";
import { getStaffUser } from "@/lib/staff-auth";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit article", robots: { index: false, follow: false } };

export default async function EditArticlePage(props: PageProps<"/admin/articles/[id]">) {
  const { id } = await props.params;
  const [article, articles, staffUser] = await Promise.all([getArticle(id), getArticles(), getStaffUser()]);
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
            {article.reviewer && article.reviewedAt ? ` · reviewed by ${article.reviewer.name} on ${formatShortDate(article.reviewedAt)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={articleStatusBadgeVariant[article.status]}>{articleStatusLabels[article.status]}</Badge>
          {article.status === "PUBLISHED" ? (
            <a href={edHref(article.slug)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm underline underline-offset-4">View live<ExternalLink aria-hidden="true" className="size-3.5" /></a>
          ) : null}
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Clinical review</CardTitle></CardHeader>
        <CardContent>
          <ArticleReviewActions id={article.id} status={article.status} isAuthor={staffUser?.id === article.author.id} reviewNotes={article.reviewNotes} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Content</CardTitle></CardHeader>
        <CardContent>
          <ArticleEditor
            id={article.id}
            slugOptions={slugOptions}
            locked={article.status === "PUBLISHED"}
            defaultValues={{ slug: article.slug, title: article.title, summary: article.summary, keyFacts: article.keyFacts.join("\n"), body: article.body, sources: article.sources.join("\n") }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
