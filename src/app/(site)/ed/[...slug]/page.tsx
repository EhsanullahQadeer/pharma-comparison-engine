import { notFound } from "next/navigation";
import { cache } from "react";

import { getPublishedArticle } from "@/actions/articles/articles";
import { ArticleView } from "@/components/ed/article-view";
import { ComingSoonView, comingSoonMetadata, findComingSoonPage } from "@/components/ed/coming-soon-view";
import { edHref, edPages } from "@/lib/ed-pages";
import { SIDE_EFFECTS_CHECKED_ON, getSideEffectsArticle } from "@/lib/side-effects-articles";

import type { Metadata } from "next";

// Article pages appear once a clinically reviewed article is published; revalidation (plus
// revalidatePath on publish) lets that happen without a rebuild.
export const revalidate = 300;
export const dynamicParams = false;

// Live pages have their own route folders; this route serves article and preview pages.
export function generateStaticParams() {
  return edPages.filter((page) => !page.live).map((page) => ({ slug: page.path.split("/") }));
}

const loadArticle = cache(getPublishedArticle);

async function resolvePage(params: Promise<{ slug: string[] }>) {
  const { slug } = await params;
  const page = findComingSoonPage(slug.join("/"));
  if (!page) notFound();
  const article = page.kind === "article" ? await loadArticle(page.path) : null;
  // Side-effects pages fall back to their source-checked content until a reviewed article is published.
  const sourced = article ? null : getSideEffectsArticle(page.path);
  return { page, article, sourced };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { page, article, sourced } = await resolvePage(params);
  if (article) return { title: article.title, description: article.summary, alternates: { canonical: edHref(page.path) } };
  // Readable, but kept out of search results until a named clinician has reviewed it.
  if (sourced) return { title: sourced.title, description: sourced.summary, alternates: { canonical: edHref(page.path) }, robots: { index: false, follow: true } };
  return comingSoonMetadata(page);
}

export default async function EdCatalogPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { page, article, sourced } = await resolvePage(params);
  if (article) {
    const vetting = { kind: "reviewed", authorName: article.author.name, reviewerName: article.reviewer?.name ?? null, reviewedAt: article.reviewedAt, revision: article.revision } as const;
    return <ArticleView page={page} article={article} vetting={vetting} />;
  }
  if (sourced) return <ArticleView page={page} article={sourced} vetting={{ kind: "sourced", checkedOn: SIDE_EFFECTS_CHECKED_ON }} />;
  return <ComingSoonView page={page} />;
}
