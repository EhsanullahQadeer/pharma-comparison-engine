"use client";

import { ExternalLink, Pencil } from "lucide-react";

import type { getArticles } from "@/actions/articles/articles";
import { ArticlePublishActions } from "@/components/admin/article-publish-actions";
import { Badge } from "@/components/common/badge";
import { buttonVariants } from "@/components/common/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { TableViewPagination } from "@/components/common/table-view-pagination";
import TooltipWrapper from "@/components/common/TooltipWrapper";
import Link from "@/components/Link";
import { useTableView } from "@/hooks/useTableView";
import { formatShortDate } from "@/lib/comparison";
import { articleStatusBadgeVariant, articleStatusLabels } from "@/lib/content-labels";
import { edHref } from "@/lib/ed-pages";
import type { TableSorters } from "@/types/table";

// `pageTitle` is the public page the article belongs to, resolved by the server page.
type ArticleRow = Awaited<ReturnType<typeof getArticles>>[number] & { pageTitle: string };

const sorters = {
  title: (article) => article.title,
  page: (article) => article.pageTitle,
  status: (article) => `${articleStatusLabels[article.status]} ${article.active ? "" : "Inactive"}`,
  revision: (article) => article.revision,
  author: (article) => article.author.name,
  published: (article) => article.publishedAt,
  updated: (article) => article.updatedAt,
} satisfies TableSorters<ArticleRow>;

const iconLinkClass = buttonVariants({ variant: "ghost", size: "icon-sm" });

// `canPublish` is false for roles that can read articles but not change them: they only get View.
export function ArticlesTable({ articles, canPublish }: { articles: ArticleRow[]; canPublish: boolean }) {
  const view = useTableView(articles, sorters);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style={{ width: 260 }} {...view.sortProps("title")}>Article</TableHead>
            <TableHead style={{ width: 220 }} {...view.sortProps("page")}>Page</TableHead>
            <TableHead style={{ width: 190 }} {...view.sortProps("status")}>Status</TableHead>
            <TableHead style={{ width: 100 }} {...view.sortProps("revision")}>Revision</TableHead>
            <TableHead style={{ width: 150 }} {...view.sortProps("author")}>Author</TableHead>
            <TableHead style={{ width: 130 }} {...view.sortProps("published")}>Published</TableHead>
            <TableHead style={{ width: 130 }} {...view.sortProps("updated")}>Updated</TableHead>
            <TableHead style={{ width: 320 }} className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.rows.map((article) => (
            <TableRow key={article.id} className="hover:bg-muted/50">
              <TableCell className="font-medium whitespace-normal!">
                <Link href={`/admin/articles/${article.id}`} className="hover:underline">{article.title}</Link>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground whitespace-normal!">{article.pageTitle}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={articleStatusBadgeVariant[article.status]}>{articleStatusLabels[article.status]}</Badge>
                  {article.active ? null : <Badge variant="outline">Inactive</Badge>}
                </div>
              </TableCell>
              <TableCell className="tabular-nums">{article.revision}</TableCell>
              <TableCell className="text-muted-foreground">{article.author.name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{article.publishedAt ? formatShortDate(article.publishedAt) : "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatShortDate(article.updatedAt)}</TableCell>
              <TableCell>
                <div className="flex items-start justify-end gap-1">
                  <TooltipWrapper label="View the public page">
                    <a href={edHref(article.slug)} target="_blank" rel="noopener noreferrer" aria-label={`View the public page for ${article.title}`} className={iconLinkClass}><ExternalLink aria-hidden="true" className="size-4" /></a>
                  </TooltipWrapper>
                  {canPublish ? (
                    <>
                      <TooltipWrapper label="Edit">
                        <Link href={`/admin/articles/${article.id}`} aria-label={`Edit ${article.title}`} className={iconLinkClass}><Pencil aria-hidden="true" className="size-4" /></Link>
                      </TooltipWrapper>
                      <ArticlePublishActions compact id={article.id} published={article.status === "PUBLISHED"} active={article.active} />
                    </>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TableViewPagination pagination={view.pagination} />
    </>
  );
}
