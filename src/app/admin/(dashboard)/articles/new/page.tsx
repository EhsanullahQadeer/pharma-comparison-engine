import { ArrowLeft } from "lucide-react";

import { getArticles } from "@/actions/articles/articles";
import { ArticleEditor } from "@/components/admin/article-editor";
import { Card, CardContent } from "@/components/common/card";
import Link from "@/components/Link";
import { articleSlugOptions } from "@/lib/article-options";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "New article", robots: { index: false, follow: false } };

export default async function NewArticlePage() {
  const articles = await getArticles();
  const slugOptions = articleSlugOptions(articles.map((article) => article.slug));

  return (
    <div className="space-y-4">
      <Link href="/admin/articles" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        Back to articles
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">New article</h1>
        <p className="mt-1 text-sm text-muted-foreground">Drafts are never public. Publish it from the article&apos;s page when it&apos;s ready.</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <ArticleEditor id={null} slugOptions={slugOptions} defaultValues={{ slug: "", title: "", summary: "", keyFacts: "", body: "", sources: "" }} />
        </CardContent>
      </Card>
    </div>
  );
}
