"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { articleFormSchema, toArticleData } from "@/actions/articles/article-schema";
import type { ArticleFormValues } from "@/actions/articles/article-schema";
import type { StaffRole } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { edHref } from "@/lib/ed-pages";
import { prisma } from "@/lib/prisma";
import { revalidatePublicSite } from "@/lib/revalidate-public-site";
import { requireStaffRole } from "@/lib/staff-auth";
import { untrustedSources } from "@/lib/trusted-sources";

export type ArticleActionState = { error?: string; id?: string };

const AUTHOR_ROLES: StaffRole[] = ["CONTENT_REVIEWER", "ADMINISTRATOR"];
const READ_ROLES: StaffRole[] = ["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"];

async function requireRole(roles: StaffRole[]) {
  try {
    return await requireStaffRole(roles);
  } catch {
    return null;
  }
}

function revalidateArticle(slug: string, id?: string) {
  revalidatePath("/admin/articles");
  if (id) revalidatePath(`/admin/articles/${id}`);
  revalidatePath(edHref(slug));
  revalidatePublicSite();
}

export async function getArticles() {
  await requireStaffRole(READ_ROLES);
  return prisma.article.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: { id: true, slug: true, title: true, status: true, active: true, revision: true, updatedAt: true, publishedAt: true, author: { select: { name: true } } },
  });
}

export async function getArticle(id: string) {
  await requireStaffRole(READ_ROLES);
  const article = await prisma.article.findUnique({ where: { id }, include: { author: { select: { name: true } } } });
  if (!article) notFound();
  return article;
}

// Create or edit. Editing a PUBLISHED article keeps it live: the saved text replaces the public page
// straight away as a new revision.
export async function saveArticle(id: string | null, values: ArticleFormValues): Promise<ArticleActionState> {
  const staffUser = await requireRole(AUTHOR_ROLES);
  if (!staffUser) return { error: "Only content reviewers and administrators can write articles." };

  const parsed = articleFormSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const data = toArticleData(parsed.data);

  const clash = await prisma.article.findUnique({ where: { slug: data.slug }, select: { id: true } });
  if (clash && clash.id !== id) return { error: "Another article is already written for that page." };

  if (!id) {
    const created = await prisma.article.create({ data: { ...data, topic: data.slug.split("/")[0], authorId: staffUser.id } });
    await recordAuditLog({ actorId: staffUser.id, action: "CREATE", entityType: "Article", entityId: created.id, changes: { slug: data.slug } });
    revalidateArticle(data.slug);
    return { id: created.id };
  }

  const existing = await prisma.article.findUnique({ where: { id }, select: { status: true, slug: true } });
  if (!existing) return { error: "Article not found." };
  const isPublished = existing.status === "PUBLISHED";
  await prisma.article.update({
    where: { id },
    data: { ...data, topic: data.slug.split("/")[0], ...(isPublished ? { revision: { increment: 1 } } : {}) },
  });
  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "Article", entityId: id, changes: { slug: data.slug, newRevision: isPublished } });
  revalidateArticle(existing.slug, id);
  if (existing.slug !== data.slug) revalidateArticle(data.slug, id);
  return { id };
}

// Puts an article on the public site. Its sources are re-checked here because a draft may have been
// written before the trusted-sources rule existed.
export async function publishArticle(id: string): Promise<ArticleActionState> {
  const staffUser = await requireRole(AUTHOR_ROLES);
  if (!staffUser) return { error: "Only content reviewers and administrators can publish articles." };
  const article = await prisma.article.findUnique({ where: { id }, select: { status: true, slug: true, sources: true } });
  if (!article) return { error: "Article not found." };
  if (article.status === "PUBLISHED") return { error: "This article is already published." };
  const [refused] = untrustedSources(article.sources);
  if (article.sources.length === 0 || refused) return { error: `Every source needs a link to a trusted medical source before publishing.${refused ? ` Not accepted: ${refused}` : ""}` };

  await prisma.article.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "Article", entityId: id, changes: { status: "PUBLISHED" } });
  revalidateArticle(article.slug, id);
  return { id };
}

export async function unpublishArticle(id: string): Promise<ArticleActionState> {
  const staffUser = await requireRole(AUTHOR_ROLES);
  if (!staffUser) return { error: "You are not authorized to unpublish articles." };
  const article = await prisma.article.update({ where: { id }, data: { status: "DRAFT", publishedAt: null }, select: { slug: true } });
  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "Article", entityId: id, changes: { status: "DRAFT", unpublished: true } });
  revalidateArticle(article.slug, id);
  return { id };
}

// The on/off switch, separate from publishing: an inactive article keeps its status and publish date
// but is left off the public site until it is switched back on.
export async function setArticleActive(id: string, active: boolean): Promise<ArticleActionState> {
  const staffUser = await requireRole(AUTHOR_ROLES);
  if (!staffUser) return { error: "Only content reviewers and administrators can activate or deactivate articles." };
  const existing = await prisma.article.findUnique({ where: { id }, select: { slug: true } });
  if (!existing) return { error: "Article not found." };
  await prisma.article.update({ where: { id }, data: { active } });
  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "Article", entityId: id, changes: { active } });
  revalidateArticle(existing.slug, id);
  return { id };
}

// Public reads — PUBLISHED and active only, never drafts or articles staff have switched off.
export async function getPublishedArticle(slug: string) {
  return prisma.article.findFirst({
    where: { slug, status: "PUBLISHED", active: true },
    select: { title: true, summary: true, keyFacts: true, body: true, sources: true, publishedAt: true, updatedAt: true },
  });
}

// Hub pages list which article pages are readable now, with their summaries.
export async function getPublishedArticleSummaries() {
  return prisma.article.findMany({ where: { status: "PUBLISHED", active: true }, select: { slug: true, summary: true } });
}

// Used only by the sitemap. Keep it separate from article bodies so generating the sitemap stays
// lightweight as the editorial library grows.
export async function getPublishedArticleSitemapEntries() {
  return prisma.article.findMany({
    where: { status: "PUBLISHED", active: true },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}
