"use server";

import { displayName, variantLabel, variantMedicineNote } from "@/lib/comparison";
import { prisma } from "@/lib/prisma";
import { CLICK_DETAIL_NOT_RECORDED, clickDeviceLabels, ukRegionLabels } from "@/lib/referral-labels";
import { requireStaffRole } from "@/lib/staff-auth";
import type { ClickBreakdownRow, ClickReportRow } from "@/types/click-report";

// priceSum/pricedClicks cover only the clicks that recorded the price shown.
type Tally = { clicks: number; lastClickAt: Date; priceSum: number; pricedClicks: number };
type Group = { clicks: number; lastClickAt: Date; priceSum?: number; pricedClicks?: number };

function addTo(tallies: Map<string, Tally>, key: string, { clicks, lastClickAt, priceSum = 0, pricedClicks = 0 }: Group) {
  const tally = tallies.get(key);
  if (!tally) {
    tallies.set(key, { clicks, lastClickAt, priceSum, pricedClicks });
    return;
  }
  tally.clicks += clicks;
  tally.priceSum += priceSum;
  tally.pricedClicks += pricedClicks;
  if (lastClickAt > tally.lastClickAt) tally.lastClickAt = lastClickAt;
}

function averagePricePence({ priceSum = 0, pricedClicks = 0 }: Group) {
  return pricedClicks > 0 ? Math.round(priceSum / pricedClicks) : null;
}

const countryNames = new Intl.DisplayNames("en-GB", { type: "region" });

function countryName(code: string) {
  try {
    return countryNames.of(code) ?? code;
  } catch {
    return code;
  }
}

function locationLabel({ country, region, city }: { country: string | null; region: string | null; city: string | null }) {
  const parts = [city, region ? (country === "GB" ? ukRegionLabels[region] : undefined) ?? region : null, country ? countryName(country) : null];
  return parts.filter(Boolean).join(", ") || CLICK_DETAIL_NOT_RECORDED;
}

// Outbound "view at pharmacy" clicks in a period, broken down by pharmacy, by product and by both,
// then by where and how visitors clicked (area, device, browser, page). `from` is inclusive, `to`
// exclusive, null is unbounded. Likely bots are counted separately and left out of every
// breakdown, the same as on the analytics page.
export async function getClickReport({ from, to }: { from: Date | null; to: Date | null }) {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);

  const createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) };
  const where = { createdAt, isLikelyBot: false };
  const counted = { where, _count: { _all: true }, _max: { createdAt: true } } as const;
  const [grouped, botClicks, locationGroups, deviceGroups, pageGroups] = await Promise.all([
    prisma.referralClick.groupBy({
      by: ["providerId", "productVariantId"],
      where,
      _count: { _all: true, totalPricePence: true },
      _sum: { totalPricePence: true },
      _max: { createdAt: true },
    }),
    prisma.referralClick.count({ where: { createdAt, isLikelyBot: true } }),
    prisma.referralClick.groupBy({ by: ["country", "region", "city"], ...counted }),
    prisma.referralClick.groupBy({ by: ["deviceType", "os", "browser"], ...counted }),
    prisma.referralClick.groupBy({ by: ["sourcePath"], ...counted }),
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
    const counts: Group = { clicks: group._count._all, lastClickAt, priceSum: group._sum.totalPricePence ?? 0, pricedClicks: group._count.totalPricePence };
    const productKey = group.productVariantId ?? "";
    addTo(pharmacyTallies, pharmacy.id, counts);
    addTo(productTallies, productKey, counts);
    byPharmacyProduct.push({
      key: `${pharmacy.id}:${productKey}`,
      pharmacy,
      product: products.get(productKey) ?? removedProduct,
      clicks: counts.clicks,
      share: share(counts.clicks),
      averagePricePence: averagePricePence(counts),
      lastClickAt,
    });
  }

  const byPharmacy: ClickReportRow[] = [...pharmacyTallies].map(([id, tally]) => ({
    key: id,
    pharmacy: pharmacies.get(id) ?? null,
    product: null,
    clicks: tally.clicks,
    share: share(tally.clicks),
    // A pharmacy's clicks span different products, so an average price across them means nothing.
    averagePricePence: null,
    lastClickAt: tally.lastClickAt,
  }));
  const byProduct: ClickReportRow[] = [...productTallies].map(([id, tally]) => ({
    key: id,
    pharmacy: null,
    product: products.get(id) ?? removedProduct,
    clicks: tally.clicks,
    share: share(tally.clicks),
    averagePricePence: averagePricePence(tally),
    lastClickAt: tally.lastClickAt,
  }));

  const locationTallies = new Map<string, Tally>();
  const deviceTallies = new Map<string, Tally>();
  const browserTallies = new Map<string, Tally>();
  const pageTallies = new Map<string, Tally>();
  for (const group of locationGroups) {
    if (group._max.createdAt) addTo(locationTallies, locationLabel(group), { clicks: group._count._all, lastClickAt: group._max.createdAt });
  }
  for (const group of deviceGroups) {
    if (!group._max.createdAt) continue;
    const counts = { clicks: group._count._all, lastClickAt: group._max.createdAt };
    const device = group.deviceType ? [clickDeviceLabels[group.deviceType], group.os].filter(Boolean).join(" · ") : CLICK_DETAIL_NOT_RECORDED;
    addTo(deviceTallies, device, counts);
    addTo(browserTallies, group.browser ?? CLICK_DETAIL_NOT_RECORDED, counts);
  }
  for (const group of pageGroups) {
    if (group._max.createdAt) addTo(pageTallies, group.sourcePath ?? CLICK_DETAIL_NOT_RECORDED, { clicks: group._count._all, lastClickAt: group._max.createdAt });
  }

  const mostClickedFirst = (a: { clicks: number }, b: { clicks: number }) => b.clicks - a.clicks;
  const breakdown = (tallies: Map<string, Tally>): ClickBreakdownRow[] =>
    [...tallies]
      .map(([label, tally]) => ({ key: label, label, clicks: tally.clicks, share: share(tally.clicks), lastClickAt: tally.lastClickAt }))
      .sort(mostClickedFirst);

  return {
    peopleClicks,
    botClicks,
    byPharmacy: byPharmacy.sort(mostClickedFirst),
    byProduct: byProduct.sort(mostClickedFirst),
    byPharmacyProduct: byPharmacyProduct.sort(mostClickedFirst),
    byLocation: breakdown(locationTallies),
    byDevice: breakdown(deviceTallies),
    byBrowser: breakdown(browserTallies),
    byPage: breakdown(pageTallies),
  };
}
