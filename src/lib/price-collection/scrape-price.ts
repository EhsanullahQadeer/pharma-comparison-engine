import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import { chromium, type Page } from "playwright";

import { collectPublicWebsite } from "@/lib/discovery/public-web";

export type ScrapedPrice = {
  itemPricePence: number;
  deliveryFeePence: number;
  deliveryAssumption: string;
  availability: "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";
  sourceUrl: string;
  evidence?: string;
  source: "json-ld-product-offer" | "rendered-product-card";
};

type ScrapeProductPriceOptions = {
  matchedTokens?: string[];
  humanAssist?: boolean;
};

function extractJsonLdBlocks(html: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [];
  for (const match of html.matchAll(/<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed: unknown = JSON.parse(match[1].trim());
      for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
        if (node && typeof node === "object") blocks.push(node as Record<string, unknown>);
      }
    } catch {
      // Malformed JSON-LD on this block; other blocks may still be usable.
    }
  }
  return blocks;
}

function hasType(node: Record<string, unknown>, type: string): boolean {
  const value = node["@type"];
  return Array.isArray(value) ? value.includes(type) : value === type;
}

function toPence(value: unknown): number | undefined {
  let num: number | undefined;
  if (typeof value === "string") num = Number(value.replace(/[^\d.]/g, ""));
  else if (typeof value === "number") num = value;
  if (num === undefined || !Number.isFinite(num) || num < 0) return undefined;
  return Math.round(num * 100);
}

function moneyTextToPence(value: string): number | undefined {
  return toPence(value.replace(/\s/g, ""));
}

const availabilityMap: Record<string, "IN_STOCK" | "OUT_OF_STOCK"> = {
  "http://schema.org/InStock": "IN_STOCK",
  "https://schema.org/InStock": "IN_STOCK",
  "http://schema.org/OutOfStock": "OUT_OF_STOCK",
  "https://schema.org/OutOfStock": "OUT_OF_STOCK",
};

function pickStructuredPrice(html: string, matchedTokens: string[], sourceUrl: string): ScrapedPrice | undefined {
  for (const block of extractJsonLdBlocks(html)) {
    if (!hasType(block, "Product")) continue;
    if (matchedTokens.length > 0 && typeof block.name === "string") {
      const name = block.name.toLowerCase();
      if (!matchedTokens.some((token) => name.includes(token.toLowerCase()))) continue;
    }

    const offers = block.offers;
    const offer = Array.isArray(offers) ? offers[0] : offers;
    if (!offer || typeof offer !== "object") continue;
    const offerNode = offer as Record<string, unknown>;
    if (offerNode.priceCurrency !== "GBP") continue;

    const itemPricePence = toPence(offerNode.price);
    if (itemPricePence === undefined) continue;

    const priceSpecRaw = offerNode.priceSpecification;
    const priceSpec = (Array.isArray(priceSpecRaw) ? priceSpecRaw[0] : priceSpecRaw) as Record<string, unknown> | undefined;
    let deliveryFeePence = 0;
    let deliveryAssumption = "As shown on the provider's product page at collection time";
    if (priceSpec && hasType(priceSpec, "DeliveryChargeSpecification") && priceSpec.priceCurrency === "GBP") {
      deliveryFeePence = toPence(priceSpec.price) ?? 0;
      if (typeof priceSpec.name === "string") deliveryAssumption = priceSpec.name;
    }

    const availability = typeof offerNode.availability === "string" ? (availabilityMap[offerNode.availability] ?? "UNKNOWN") : "UNKNOWN";
    return { itemPricePence, deliveryFeePence, deliveryAssumption, availability, sourceUrl, source: "json-ld-product-offer" };
  }
  return undefined;
}

async function handleVerificationPage(page: Page, humanAssist: boolean) {
  const text = await page.locator("body").innerText();
  if (!/verify you are human|checking your browser|captcha|recaptcha|hcaptcha/i.test(text)) return;
  if (!humanAssist) throw new Error("Rendered page requires manual verification.");
  const rl = createInterface({ input, output });
  try {
    await rl.question(`Manual verification needed for ${page.url()}. Complete it in the browser, then press Enter here to continue.`);
  } finally {
    rl.close();
  }
}

async function collectRenderedProductCard(url: string, matchedTokens: string[], humanAssist: boolean): Promise<ScrapedPrice | undefined> {
  if (humanAssist) mkdirSync(join(process.cwd(), "tmp", "price-collection-human-browser"), { recursive: true });
  const browserContext = humanAssist
    ? await chromium.launchPersistentContext(join(process.cwd(), "tmp", "price-collection-human-browser"), { headless: false, viewport: null })
    : await chromium.launch({ headless: true }).then((browser) => browser.newContext());
  const browser = browserContext.browser();
  try {
    const page = await browserContext.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      await handleVerificationPage(page, humanAssist);
      const result = await readRenderedCard(page, matchedTokens);
      if (result) return { ...result, sourceUrl: page.url(), source: "rendered-product-card" };
      await page.waitForTimeout(750);
    }
    return undefined;
  } finally {
    await browserContext.close();
    await browser?.close();
  }
}

async function readRenderedCard(page: Page, matchedTokens: string[]) {
  return page.evaluate((tokens) => {
    const money = /£\s*\d+(?:\.\d{2})?/g;
    const fee = /postage|packaging|delivery|shipping/i;
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")];
    const matches: { price: string; evidence: string }[] = [];

    for (const heading of headings) {
      const headingText = (heading.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase();
      if (!tokens.includes(headingText)) continue;
      let card = heading.parentElement;
      for (let depth = 0; card && depth < 6; depth += 1, card = card.parentElement) {
        if (card.querySelectorAll("h1,h2,h3,h4,h5,h6").length > 1) break;
        const text = card.innerText.replace(/\s+/g, " ").trim();
        if (fee.test(text)) break;
        const prices = [...new Set(text.match(money) ?? [])];
        if (prices.length > 1) break;
        if (prices.length !== 1) continue;
        matches.push({ price: prices[0].replace(/\s/g, ""), evidence: text });
        break;
      }
    }

    const delivery = new Set<string>();
    for (const element of document.querySelectorAll("p,span,div")) {
      const text = ((element as HTMLElement).innerText ?? "").replace(/\s+/g, " ").trim();
      if (text.length > 160 || !fee.test(text) || /\bfree\b/i.test(text)) continue;
      const prices = text.match(money) ?? [];
      if (prices.length === 1) delivery.add(prices[0].replace(/\s/g, ""));
    }

    const uniquePrices = new Set(matches.map((match) => match.price));
    if (uniquePrices.size !== 1) return null;
    return {
      price: matches[0].price,
      deliveryPrice: delivery.size === 1 ? [...delivery][0] : null,
      evidence: matches[0].evidence,
    };
  }, matchedTokens.map((token) => token.toLowerCase()))
    .then((result) => {
      if (!result) return undefined;
      const itemPricePence = moneyTextToPence(result.price);
      if (itemPricePence === undefined) return undefined;
      return {
        itemPricePence,
        deliveryFeePence: result.deliveryPrice ? moneyTextToPence(result.deliveryPrice) ?? 0 : 0,
        deliveryAssumption: result.deliveryPrice ? "Visible delivery/postage text on the rendered page" : "No separate delivery fee found on the rendered product card",
        availability: "UNKNOWN" as const,
        evidence: result.evidence,
      };
    });
}

export async function scrapeProductPrice(url: string, options: ScrapeProductPriceOptions = {}): Promise<ScrapedPrice> {
  const matchedTokens = options.matchedTokens ?? [];

  try {
    const page = await collectPublicWebsite(url);
    const structured = pickStructuredPrice(page.html, matchedTokens, page.finalUrl);
    if (structured) return structured;
  } catch (error) {
    if (!(error instanceof Error) || !/robots rules|human-verification|captcha|review (?:it|the page) manually|unexpected content type/i.test(error.message)) throw error;
  }

  const rendered = await collectRenderedProductCard(url, matchedTokens, Boolean(options.humanAssist));
  if (rendered) return rendered;
  throw new Error("No unambiguous GBP product price found for the confirmed product match.");
}
