"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { articleFormSchema, toArticleData } from "@/actions/articles/article-schema";
import type { ArticleFormValues } from "@/actions/articles/article-schema";
import type { StaffRole } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { edHref } from "@/lib/ed-pages";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/staff-auth";

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
  revalidatePath("/ed", "layout");
}

export async function getArticles() {
  await requireStaffRole(READ_ROLES);
  return prisma.article.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: { id: true, slug: true, title: true, status: true, revision: true, updatedAt: true, publishedAt: true, reviewedAt: true, author: { select: { name: true } }, reviewer: { select: { name: true } } },
  });
}

export async function getArticle(id: string) {
  await requireStaffRole(READ_ROLES);
  const article = await prisma.article.findUnique({ where: { id }, include: { author: { select: { id: true, name: true } }, reviewer: { select: { name: true } } } });
  if (!article) notFound();
  return article;
}

// Create or edit. Editing a PUBLISHED article is a new revision: it leaves the public site and goes
// back to IN_REVIEW, because changed medical content needs a fresh clinical review.
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
  const wasPublished = existing.status === "PUBLISHED";
  await prisma.article.update({
    where: { id },
    data: { ...data, topic: data.slug.split("/")[0], ...(wasPublished ? { status: "IN_REVIEW", revision: { increment: 1 }, publishedAt: null } : {}) },
  });
  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "Article", entityId: id, changes: { slug: data.slug, backToReview: wasPublished } });
  revalidateArticle(existing.slug, id);
  if (existing.slug !== data.slug) revalidateArticle(data.slug, id);
  return { id };
}

export async function submitArticleForReview(id: string): Promise<ArticleActionState> {
  const staffUser = await requireRole(AUTHOR_ROLES);
  if (!staffUser) return { error: "You are not authorized to submit articles." };
  const article = await prisma.article.findUnique({ where: { id }, select: { status: true, slug: true } });
  if (article?.status !== "DRAFT") return { error: "Only drafts can be sent for review." };
  await prisma.article.update({ where: { id }, data: { status: "IN_REVIEW", reviewNotes: null } });
  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "Article", entityId: id, changes: { status: "IN_REVIEW" } });
  revalidateArticle(article.slug, id);
  return { id };
}

// The clinical-review gate: a named reviewer who is not the author approves (publishes) or returns
// the article with notes. Self-approval is refused so every public article has two sets of eyes.
export async function reviewArticle(id: string, decision: "approve" | "return", notes?: string): Promise<ArticleActionState> {
  const staffUser = await requireRole(AUTHOR_ROLES);
  if (!staffUser) return { error: "Only content reviewers and administrators can review articles." };
  const article = await prisma.article.findUnique({ where: { id }, select: { status: true, slug: true, authorId: true } });
  if (article?.status !== "IN_REVIEW") return { error: "This article isn't waiting for review." };
  if (article.authorId === staffUser.id) return { error: "You wrote this article, so a different reviewer has to approve it." };

  const now = new Date();
  const data = decision === "approve"
    ? { status: "PUBLISHED" as const, reviewerId: staffUser.id, reviewedAt: now, publishedAt: now, reviewNotes: null }
    : { status: "DRAFT" as const, reviewNotes: notes?.trim() || "Returned without notes." };
  await prisma.article.update({ where: { id }, data });
  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "Article", entityId: id, changes: { review: decision } });
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

// Public reads — PUBLISHED only, never drafts or articles awaiting review.
export async function getPublishedArticle(slug: string) {
  return prisma.article.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { title: true, summary: true, keyFacts: true, body: true, sources: true, revision: true, publishedAt: true, reviewedAt: true, updatedAt: true, author: { select: { name: true } }, reviewer: { select: { name: true } } },
  });
}

// Hub pages list which article pages are readable now, with their summaries.
export async function getPublishedArticleSummaries() {
  return prisma.article.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, summary: true } });
}

// Used only by the sitemap. Keep it separate from article bodies so generating the sitemap stays
// lightweight as the editorial library grows.
export async function getPublishedArticleSitemapEntries() {
  return prisma.article.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}
