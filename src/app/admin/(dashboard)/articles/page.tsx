import { Plus } from "lucide-react";

import { getArticles } from "@/actions/articles/articles";
import { ArticlesTable } from "@/components/admin/articles-table";
import { buttonVariants } from "@/components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import Link from "@/components/Link";
import { articlePages } from "@/lib/ed-pages";
import { getStaffUser } from "@/lib/staff-auth";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Articles", robots: { index: false, follow: false } };

const pageTitles = new Map(articlePages.map((page) => [page.path, page.title]));

export default async function AdminArticlesPage() {
  const [rows, staffUser] = await Promise.all([getArticles(), getStaffUser()]);
  const articles = rows.map((article) => ({ ...article, pageTitle: pageTitles.get(article.slug) ?? article.slug }));
  const canPublish = staffUser?.role === "ADMINISTRATOR" || staffUser?.role === "CONTENT_REVIEWER";
  const live = articles.filter((article) => article.status === "PUBLISHED" && article.active).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Articles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Guides, safety and reference pages. An article appears on the public site once it is published and active, and every source must link to a trusted medical source.
          </p>
        </div>
        <Link href="/admin/articles/new" className={buttonVariants({ className: "rounded-full" })}>
          <Plus aria-hidden="true" className="size-4" />
          New article
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            {articles.length} of {articlePages.length} pages written · {live} live on the site
          </CardTitle>
        </CardHeader>
        <CardContent>
          {articles.length === 0 ? (
            <EmptyState title="No articles yet." description="Start with a draft for one of the guide or safety pages." />
          ) : (
            <ArticlesTable articles={articles} canPublish={canPublish} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
