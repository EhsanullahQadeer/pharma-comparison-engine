import { collectPublicWebsite } from "@/lib/discovery/public-web";
import { robotsAllows } from "@/lib/discovery/public-web-policy";
import { openHumanBrowser, waitForHumanVerification } from "@/lib/price-collection/human-browser";
import { readRobotsInBrowser } from "@/lib/price-collection/robots-in-browser";
import { pageText, readDeliveryPolicy, readDiscountOffers } from "@/lib/price-collection/site-offers";
import { prisma } from "@/lib/prisma";
import { extractSameOriginLinks } from "@/lib/product-detection/detect-products";
import type { DetectedDeliveryPolicy, DetectedDiscount } from "@/types/pricing";

import type { Page } from "patchright";

// Reads one pharmacy's own website for its delivery charge and discount offers and saves what it
// finds as PENDING suggestions for staff. Server-only and deliberately NOT a "use server" module
// (same reason as collect-price.ts): callers do their own staff check, and the worker runs it
// outside the web app. Plain requests by default; `humanAssist` reads the same pages in the visible
// Chrome window instead, for a site behind a security check that staff complete themselves.

const DELIVERY_LINK = /deliver|shipping|postage/i;
const MAX_DELIVERY_PAGES = 2;
const MAX_PRODUCT_PAGES = 2;
const RECHECK_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export type SiteOffersCheckResult = { deliveryFound: boolean; newDeliveryPolicy: boolean; newDiscounts: number };

type ReadPage = { url: string; text: string };
type FetchPage = (url: string) => Promise<{ html: string; finalUrl: string }>;

const ROBOTS_REFUSAL = "Check stopped: the website's robots rules (read in the browser) do not permit this page.";

// Opens each page in the visible Chrome window and waits (up to five minutes) for a person to clear
// any security check. Each site's robots rules are read there first, once per origin, and a page they
// don't permit is never opened — the same rule as human-assisted price collection.
function browserPageReader(page: Page): FetchPage {
  const rules = new Map<string, string>();
  return async (url) => {
    const target = new URL(url);
    if (!rules.has(target.origin)) rules.set(target.origin, await readRobotsInBrowser(page, target.origin, true));
    if (!robotsAllows(rules.get(target.origin) ?? "", target.pathname + target.search)) throw new Error(ROBOTS_REFUSAL);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await waitForHumanVerification(page, true);
    return { html: await page.content(), finalUrl: page.url() };
  };
}

async function readSitePages(websiteDomain: string, fetchPage: FetchPage): Promise<{ homepage: ReadPage; deliveryPages: ReadPage[] }> {
  const homepage = await fetchPage(`https://${websiteDomain}`);
  const links = extractSameOriginLinks(homepage.html, new URL(homepage.finalUrl)).filter((link) => link.url !== homepage.finalUrl);
  // A link whose own address names delivery is the policy page; link text alone is a weaker hint.
  const byPath = links.filter((link) => DELIVERY_LINK.test(new URL(link.url).pathname));
  const byText = links.filter((link) => DELIVERY_LINK.test(link.text));
  const deliveryUrls = [...new Set([...byPath, ...byText].map((link) => link.url))].slice(0, MAX_DELIVERY_PAGES);

  return { homepage: { url: homepage.finalUrl, text: pageText(homepage.html) }, deliveryPages: await readPages(deliveryUrls, fetchPage) };
}

async function readPages(urls: string[], fetchPage: FetchPage): Promise<ReadPage[]> {
  const pages: ReadPage[] = [];
  for (const url of urls) {
    try {
      const page = await fetchPage(url);
      pages.push({ url: page.finalUrl, text: pageText(page.html) });
    } catch {
      // A page that can't be read (blocked, removed) just isn't a source this time.
    }
  }
  return pages;
}

// The product pages this pharmacy's prices were read from. Many small pharmacies state the
// delivery charge only there (Medy), so they are the last place looked.
async function readProductPages(providerId: string, fetchPage: FetchPage): Promise<ReadPage[]> {
  const offers = await prisma.offer.findMany({ where: { providerId }, select: { sourceUrl: true }, distinct: ["sourceUrl"], orderBy: { updatedAt: "desc" }, take: MAX_PRODUCT_PAGES });
  return readPages(offers.map((offer) => offer.sourceUrl), fetchPage);
}

// Every page the check reads, through one reader: plain requests, or the visible Chrome window.
async function readAllPages(providerId: string, websiteDomain: string, fetchPage: FetchPage) {
  const { homepage, deliveryPages } = await readSitePages(websiteDomain, fetchPage);
  // The delivery page states the policy in full; the homepage banner is the fallback, and the
  // product pages are only opened when neither gave a charge.
  const sitePolicy = findDeliveryPolicy([...deliveryPages, homepage]);
  const productPages = sitePolicy ? [] : await readProductPages(providerId, fetchPage);
  return { policy: sitePolicy ?? findDeliveryPolicy(productPages), discounts: findDiscounts([homepage, ...deliveryPages, ...productPages]) };
}

async function readAllPagesInBrowser(providerId: string, websiteDomain: string) {
  const browser = await openHumanBrowser();
  try {
    return await readAllPages(providerId, websiteDomain, browserPageReader(browser.page));
  } finally {
    await browser.close();
  }
}

function findDeliveryPolicy(pages: ReadPage[]): (DetectedDeliveryPolicy & { sourceUrl: string }) | undefined {
  for (const page of pages) {
    const policy = readDeliveryPolicy(page.text);
    if (policy) return { ...policy, sourceUrl: page.url };
  }
  return undefined;
}

function findDiscounts(pages: ReadPage[]): (DetectedDiscount & { sourceUrl: string })[] {
  const found = new Map<string, DetectedDiscount & { sourceUrl: string }>();
  for (const page of pages) {
    for (const discount of readDiscountOffers(page.text)) {
      const key = [discount.code ?? discount.eligibility, discount.valuePercent, discount.valuePence].join("|");
      if (!found.has(key)) found.set(key, { ...discount, sourceUrl: page.url });
    }
  }
  return [...found.values()];
}

export async function collectSiteOffers(providerId: string, options: { humanAssist?: boolean } = {}): Promise<SiteOffersCheckResult> {
  const provider = await prisma.provider.findUniqueOrThrow({ where: { id: providerId }, select: { websiteDomain: true } });
  const { policy, discounts } = options.humanAssist
    ? await readAllPagesInBrowser(providerId, provider.websiteDomain)
    : await readAllPages(providerId, provider.websiteDomain, collectPublicWebsite);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    let newDeliveryPolicy = false;
    if (policy) {
      // Already known in any state (pending, approved or dismissed): only note it is still there.
      const known = await tx.deliveryPolicy.findFirst({ where: { providerId, standardFeePence: policy.standardFeePence, freeOverPence: policy.freeOverPence }, select: { id: true } });
      if (known) {
        await tx.deliveryPolicy.update({ where: { id: known.id }, data: { lastSeenAt: now, evidenceText: policy.evidenceText, sourceUrl: policy.sourceUrl } });
      } else {
        await tx.deliveryPolicy.deleteMany({ where: { providerId, status: "PENDING" } });
        await tx.deliveryPolicy.create({ data: { providerId, ...policy, lastSeenAt: now } });
        newDeliveryPolicy = true;
      }
    }

    let newDiscounts = 0;
    for (const discount of discounts) {
      const known = await tx.discount.findFirst({
        where: { providerId, scraped: true, code: discount.code, valueType: discount.valueType, valuePercent: discount.valuePercent, valuePence: discount.valuePence, ...(discount.code ? {} : { eligibility: discount.eligibility }) },
        select: { id: true },
      });
      if (known) {
        await tx.discount.update({ where: { id: known.id }, data: { lastSeenAt: now, evidenceText: discount.evidenceText, sourceUrl: discount.sourceUrl } });
      } else {
        await tx.discount.create({ data: { providerId, ...discount, scraped: true, status: "PENDING", lastSeenAt: now } });
        newDiscounts += 1;
      }
    }

    await tx.provider.update({ where: { id: providerId }, data: { siteOffersCheckedAt: now } });
    return { deliveryFound: Boolean(policy), newDeliveryPolicy, newDiscounts };
  });
}

// Run after a successful price collection. Never throws: a website that can't be read must not
// fail the price that was just saved. A failed read is deliberately NOT recorded as a check: the
// "last checked" time is what marks a finding as no longer on the website, so only a read that
// actually happened may move it. The next price collection simply tries again.
export async function collectSiteOffersIfDue(providerId: string): Promise<void> {
  try {
    const provider = await prisma.provider.findUnique({ where: { id: providerId }, select: { siteOffersCheckedAt: true } });
    if (!provider || (provider.siteOffersCheckedAt && Date.now() - provider.siteOffersCheckedAt.getTime() < RECHECK_AFTER_MS)) return;
    await collectSiteOffers(providerId);
  } catch {
    // Unreadable website or a dropped database call; nothing to record.
  }
}
