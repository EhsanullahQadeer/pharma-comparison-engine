"use server";

import { displayName, variantLabel, variantMedicineNote } from "@/lib/comparison";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/staff-auth";
import type { ClickReportRow } from "@/types/click-report";

type Tally = { clicks: number; lastClickAt: Date };

function addTo(tallies: Map<string, Tally>, key: string, clicks: number, lastClickAt: Date) {
  const tally = tallies.get(key);
  if (!tally) {
    tallies.set(key, { clicks, lastClickAt });
    return;
  }
  tally.clicks += clicks;
  if (lastClickAt > tally.lastClickAt) tally.lastClickAt = lastClickAt;
}

// Outbound "view at pharmacy" clicks in a period, broken down by pharmacy, by product and by both.
// `from` is inclusive, `to` exclusive, null is unbounded. Likely bots are counted separately and
// left out of every breakdown, the same as on the analytics page.
export async function getClickReport({ from, to }: { from: Date | null; to: Date | null }) {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);

  const createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) };
  const [grouped, botClicks] = await Promise.all([
    prisma.referralClick.groupBy({
      by: ["providerId", "productVariantId"],
      where: { createdAt, isLikelyBot: false },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.referralClick.count({ where: { createdAt, isLikelyBot: true } }),
  ]);

  const variantIds = [...new Set(grouped.flatMap((group) => (group.productVariantId ? [group.productVariantId] : [])))];
  const [providers, variants] = await Promise.all([
    prisma.provider.findMany({ where: { id: { in: [...new Set(grouped.map((group) => group.providerId))] } }, select: { id: true, tradingName: true } }),
    prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, ingredient: true, brandName: true, strengthMg: true, formulation: true, packQuantity: true },
    }),
  ]);
  const pharmacies = new Map(providers.map((provider) => [provider.id, { id: provider.id, name: displayName(provider.tradingName) }]));
  const products = new Map(variants.map((variant) => [variant.id, { name: variantLabel(variant), note: variantMedicineNote(variant) }]));
  // A click outlives its product: the variant is set to null when it is deleted from the catalogue.
  const removedProduct = { name: "Product no longer in the catalogue", note: "" };

  const peopleClicks = grouped.reduce((sum, group) => sum + group._count._all, 0);
  const share = (clicks: number) => (peopleClicks > 0 ? Math.round((clicks / peopleClicks) * 1000) / 10 : 0);

  const pharmacyTallies = new Map<string, Tally>();
  const productTallies = new Map<string, Tally>();
  const byPharmacyProduct: ClickReportRow[] = [];
  for (const group of grouped) {
    const pharmacy = pharmacies.get(group.providerId);
    const lastClickAt = group._max.createdAt;
    if (!pharmacy || !lastClickAt) continue;
    const clicks = group._count._all;
    const productKey = group.productVariantId ?? "";
    addTo(pharmacyTallies, pharmacy.id, clicks, lastClickAt);
    addTo(productTallies, productKey, clicks, lastClickAt);
    byPharmacyProduct.push({
      key: `${pharmacy.id}:${productKey}`,
      pharmacy,
      product: products.get(productKey) ?? removedProduct,
      clicks,
      share: share(clicks),
      lastClickAt,
    });
  }

  const byPharmacy: ClickReportRow[] = [...pharmacyTallies].map(([id, tally]) => ({
    key: id,
    pharmacy: pharmacies.get(id) ?? null,
    product: null,
    clicks: tally.clicks,
    share: share(tally.clicks),
    lastClickAt: tally.lastClickAt,
  }));
  const byProduct: ClickReportRow[] = [...productTallies].map(([id, tally]) => ({
    key: id,
    pharmacy: null,
    product: products.get(id) ?? removedProduct,
    clicks: tally.clicks,
    share: share(tally.clicks),
    lastClickAt: tally.lastClickAt,
  }));

  const mostClickedFirst = (a: ClickReportRow, b: ClickReportRow) => b.clicks - a.clicks;
  return {
    peopleClicks,
    botClicks,
    byPharmacy: byPharmacy.sort(mostClickedFirst),
    byProduct: byProduct.sort(mostClickedFirst),
    byPharmacyProduct: byPharmacyProduct.sort(mostClickedFirst),
  };
}
