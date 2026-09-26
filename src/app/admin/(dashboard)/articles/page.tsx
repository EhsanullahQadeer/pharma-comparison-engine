import { Plus } from "lucide-react";

import { getArticles } from "@/actions/articles/articles";
import { Badge } from "@/components/common/badge";
import { buttonVariants } from "@/components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import Link from "@/components/Link";
import { formatShortDate } from "@/lib/comparison";
import { articleStatusBadgeVariant, articleStatusLabels } from "@/lib/content-labels";
import { articlePages } from "@/lib/ed-pages";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Articles", robots: { index: false, follow: false } };

const pageTitles = new Map(articlePages.map((page) => [page.path, page.title]));

export default async function AdminArticlesPage() {
  const articles = await getArticles();
  const published = articles.filter((article) => article.status === "PUBLISHED").length;
  const inReview = articles.filter((article) => article.status === "IN_REVIEW").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Articles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Guides, safety and reference pages. An article appears on the public site only after a reviewer who didn&apos;t write it approves it.
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
            {articles.length} of {articlePages.length} pages drafted · {inReview} awaiting review · {published} published
          </CardTitle>
        </CardHeader>
        <CardContent>
          {articles.length === 0 ? (
            <EmptyState title="No articles yet." description="Start with a draft for one of the guide or safety pages." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ width: 260 }}>Article</TableHead>
                  <TableHead style={{ width: 220 }}>Page</TableHead>
                  <TableHead style={{ width: 190 }}>Status</TableHead>
                  <TableHead style={{ width: 90 }}>Revision</TableHead>
                  <TableHead style={{ width: 150 }}>Author</TableHead>
                  <TableHead style={{ width: 150 }}>Reviewer</TableHead>
                  <TableHead style={{ width: 130 }}>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article) => (
                  <TableRow key={article.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium whitespace-normal!">
                      <Link href={`/admin/articles/${article.id}`} className="hover:underline">{article.title}</Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-normal!">{pageTitles.get(article.slug) ?? article.slug}</TableCell>
                    <TableCell><Badge variant={articleStatusBadgeVariant[article.status]}>{articleStatusLabels[article.status]}</Badge></TableCell>
                    <TableCell className="tabular-nums">{article.revision}</TableCell>
                    <TableCell className="text-muted-foreground">{article.author.name}</TableCell>
                    <TableCell className="text-muted-foreground">{article.reviewer?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatShortDate(article.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
