"use client";

import type { getArticles } from "@/actions/articles/articles";
import { Badge } from "@/components/common/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { TableViewPagination } from "@/components/common/table-view-pagination";
import Link from "@/components/Link";
import { useTableView } from "@/hooks/useTableView";
import { formatShortDate } from "@/lib/comparison";
import { articleStatusBadgeVariant, articleStatusLabels } from "@/lib/content-labels";
import type { TableSorters } from "@/types/table";

// `pageTitle` is the public page the article belongs to, resolved by the server page.
type ArticleRow = Awaited<ReturnType<typeof getArticles>>[number] & { pageTitle: string };

const sorters = {
  title: (article) => article.title,
  page: (article) => article.pageTitle,
  status: (article) => articleStatusLabels[article.status],
  revision: (article) => article.revision,
  author: (article) => article.author.name,
  reviewer: (article) => article.reviewer?.name,
  updated: (article) => article.updatedAt,
} satisfies TableSorters<ArticleRow>;

export function ArticlesTable({ articles }: { articles: ArticleRow[] }) {
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
            <TableHead style={{ width: 150 }} {...view.sortProps("reviewer")}>Reviewer</TableHead>
            <TableHead style={{ width: 130 }} {...view.sortProps("updated")}>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.rows.map((article) => (
            <TableRow key={article.id} className="hover:bg-muted/50">
              <TableCell className="font-medium whitespace-normal!">
                <Link href={`/admin/articles/${article.id}`} className="hover:underline">{article.title}</Link>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground whitespace-normal!">{article.pageTitle}</TableCell>
              <TableCell><Badge variant={articleStatusBadgeVariant[article.status]}>{articleStatusLabels[article.status]}</Badge></TableCell>
              <TableCell className="tabular-nums">{article.revision}</TableCell>
              <TableCell className="text-muted-foreground">{article.author.name}</TableCell>
              <TableCell className="text-muted-foreground">{article.reviewer?.name ?? "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatShortDate(article.updatedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TableViewPagination pagination={view.pagination} />
    </>
  );
}
