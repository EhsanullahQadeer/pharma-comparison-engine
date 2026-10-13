import { notFound } from "next/navigation";
import { cache } from "react";

import { getPublishedArticle } from "@/actions/articles/articles";
import { ArticleView } from "@/components/ed/article-view";
import { articlePages, edHref } from "@/lib/ed-pages";
import { serializeJsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import { SOURCES_CHECKED_ON, getSourcedArticle } from "@/lib/sourced-articles";

import type { Metadata } from "next";

// Article pages: the staff-edited Article once one is PUBLISHED (revalidation plus revalidatePath
// on publish swaps it in without a rebuild), otherwise the page's built-in source-checked content.
export const revalidate = 300;
export const dynamicParams = false;

// Live pages have their own route folders; this route serves the article pages.
export function generateStaticParams() {
  return articlePages.map((page) => ({ slug: page.path.split("/") }));
}

const loadArticle = cache(getPublishedArticle);

async function resolvePage(params: Promise<{ slug: string[] }>) {
  const { slug } = await params;
  const page = articlePages.find((entry) => entry.path === slug.join("/"));
  if (!page) notFound();
  const article = await loadArticle(page.path);
  const sourced = article ? null : getSourcedArticle(page.path);
  if (!article && !sourced) notFound();
  return { page, article, sourced };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { page, article, sourced } = await resolvePage(params);
  if (article) return { title: article.title, description: article.summary, alternates: { canonical: edHref(page.path) } };
  // Readable, but kept out of search results until staff publish the article.
  return { title: sourced?.title, description: sourced?.summary, alternates: { canonical: edHref(page.path) }, robots: { index: false, follow: true } };
}

export default async function EdCatalogPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { page, article, sourced } = await resolvePage(params);
  if (article) {
    const articleSchema = siteUrl ? {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.summary,
      mainEntityOfPage: new URL(edHref(page.path), siteUrl).href,
      datePublished: article.publishedAt?.toISOString(),
      dateModified: article.updatedAt.toISOString(),
    } : null;
    return <>{articleSchema ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleSchema) }} /> : null}<ArticleView page={page} article={article} checkedOn={article.updatedAt} /></>;
  }
  return sourced ? <ArticleView page={page} article={sourced} checkedOn={SOURCES_CHECKED_ON} /> : null;
}
