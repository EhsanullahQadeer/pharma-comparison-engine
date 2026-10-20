"use server";

import { headers } from "next/headers";

import type { GridLayout } from "@/generated/prisma/client";
import { gridLayoutValues } from "@/lib/phone-layout";
import { prisma } from "@/lib/prisma";
import { isLikelyBotRequest } from "@/lib/referrals";
import { requireStaffRole } from "@/lib/staff-auth";
import type { PhoneGridLayout } from "@/types/comparison";
import type { LayoutTestRow } from "@/types/referrals";

// The phone price-grid A/B test. Page views are a bare daily counter per layout: no visitor
// identifier is stored, and nothing is stored on the visitor's device.

// Public: called once by the grid page on a phone-width screen. Bots are ignored; nothing about
// the request is kept beyond adding one to today's total.
export async function recordGridLayoutView(layout: PhoneGridLayout) {
  if (layout !== "compact" && layout !== "swipe") return;
  if (isLikelyBotRequest(await headers())) return;
  const day = new Date(new Date().toISOString().slice(0, 10));
  const gridLayout = gridLayoutValues[layout];
  await prisma.gridLayoutView.upsert({
    where: { day_layout: { day, layout: gridLayout } },
    create: { day, layout: gridLayout, views: 1 },
    update: { views: { increment: 1 } },
  });
}

// Staff report: phone page views, clicks from that layout and click-through, per layout.
export async function getLayoutTestReport({ from, to }: { from: Date | null; to: Date | null }): Promise<LayoutTestRow[]> {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);
  const range = { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) };
  const [views, clicks] = await Promise.all([
    prisma.gridLayoutView.groupBy({ by: ["layout"], where: { day: range }, _sum: { views: true }, _count: { _all: true } }),
    prisma.referralClick.groupBy({ by: ["gridLayout"], where: { createdAt: range, isLikelyBot: false, gridLayout: { not: null } }, _count: { _all: true } }),
  ]);
  const layouts: GridLayout[] = ["COMPACT", "SWIPE"];
  return layouts.map((layout) => {
    const viewRow = views.find((row) => row.layout === layout);
    const pageViews = viewRow?._sum.views ?? 0;
    const clickCount = clicks.find((row) => row.gridLayout === layout)?._count._all ?? 0;
    return { layout, pageViews, clicks: clickCount, days: viewRow?._count._all ?? 0, clickThrough: pageViews > 0 ? clickCount / pageViews : null };
  });
}
