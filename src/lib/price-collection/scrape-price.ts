import { chromium, type Page } from "patchright";

import { collectPublicWebsite } from "@/lib/discovery/public-web";
import { openHumanBrowser, waitForHumanVerification } from "@/lib/price-collection/human-browser";

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
  page?: Page;
  variant?: {
    strengthMg: number;
    packQuantity: number;
  };
  /** Reports coarse step text (e.g. "Rendering the page…") as scraping progresses. */
  onProgress?: (message: string) => void;
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

function readVariantFromRenderedText(text: string, matchedTokens: string[], variant: NonNullable<ScrapeProductPriceOptions["variant"]>) {
  const primaryToken = matchedTokens[0];
  if (!primaryToken) return undefined;

  const normalized = text.replace(/\s+/g, " ").trim();
  const sectionPattern = new RegExp(`${primaryToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+generic\\s+dose\\s+usage\\s+qty\\s+price`, "i");
  const sectionStart = normalized.search(sectionPattern);
  if (sectionStart < 0) return undefined;

  const remaining = normalized.slice(sectionStart);
  const nextSection = remaining.slice(primaryToken.length + 1).search(/\b[A-Z][A-Za-z ()]+\s+GENERIC\s+DOSE\s+USAGE\s+QTY\s+PRICE\b/);
  const sectionText = nextSection >= 0 ? remaining.slice(0, primaryToken.length + 1 + nextSection) : remaining;
  const rowPattern = /\b(\d{1,3}(?:\.\d+)?)mg\b\s+(?:On-Demand|Daily)\s+(\d{1,3})\s+\u00a3\s*(\d+(?:\.\d{2})?)/gi;
  const rows = [...sectionText.matchAll(rowPattern)].filter((row) => Number(row[1]) === variant.strengthMg && Number(row[2]) === variant.packQuantity);
  const prices = [...new Set(rows.map((row) => row[3]))];
  if (prices.length !== 1 || !rows[0]) return undefined;

  const deliveryMatch = normalized.match(/(?:postage|packaging|delivery|shipping)[^.£]{0,120}\u00a3\s*(\d+(?:\.\d{2})?)/i);
  const itemPricePence = toPence(prices[0]);
  if (itemPricePence === undefined) return undefined;

  const deliveryFeePence = deliveryMatch ? toPence(deliveryMatch[1]) ?? 0 : 0;
  return {
    itemPricePence,
    deliveryFeePence,
    deliveryAssumption: deliveryMatch ? "Visible delivery/postage text on the rendered page" : "No separate delivery fee found on the rendered product card",
    availability: "UNKNOWN" as const,
    evidence: rows[0][0].replace(/\s+/g, " ").trim(),
  };
}

async function collectRenderedProductCard(url: string, matchedTokens: string[], humanAssist: boolean, variant?: ScrapeProductPriceOptions["variant"], existingPage?: Page, onProgress?: (message: string) => void): Promise<ScrapedPrice | undefined> {
  const humanBrowser = !existingPage && humanAssist ? await openHumanBrowser() : undefined;
  const browserContext = existingPage?.context() ?? humanBrowser?.page.context() ?? await chromium.launch({ headless: true }).then((browser) => browser.newContext());
  if (!browserContext) throw new Error("Could not open the price collection browser.");
  const browser = browserContext.browser();
  const onWaiting = onProgress ? (elapsedSeconds: number) => onProgress(`Still waiting for verification… (${elapsedSeconds}s elapsed)`) : undefined;
  try {
    const page = existingPage ?? humanBrowser?.page ?? await browserContext.newPage();
    if (page.url() !== url) {
      onProgress?.("Opening the product page…");
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    }
    await waitForHumanVerification(page, humanAssist, onWaiting);
    onProgress?.("Reading the rendered page for a price card…");
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      await waitForHumanVerification(page, humanAssist, onWaiting);
      const result = await readRenderedCard(page, matchedTokens, variant);
      if (result) return { ...result, sourceUrl: page.url(), source: "rendered-product-card" };
      if (variant) {
        const textResult = readVariantFromRenderedText(await page.locator("body").innerText(), matchedTokens, variant);
        if (textResult) return { ...textResult, sourceUrl: page.url(), source: "rendered-product-card" };
      }
      await page.waitForTimeout(750);
    }
    return undefined;
  } finally {
    if (humanBrowser) {
      await humanBrowser.close();
    } else if (!existingPage) {
      await browserContext.close();
      await browser?.close();
    }
  }
}

async function readRenderedCard(page: Page, matchedTokens: string[], variant?: ScrapeProductPriceOptions["variant"]) {
  return page.evaluate(({ tokens, variant }) => {
    const money = /\u00a3\s*\d+(?:\.\d{2})?/g;
    const fee = /postage|packaging|delivery|shipping/i;
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")];
    const matches: { price: string; evidence: string }[] = [];
    const variantMatches: { price: string; evidence: string }[] = [];
    const primaryToken = tokens[0] ?? "";
    const strengthPattern = /\b(\d{1,3}(?:\.\d+)?)\s*mg\b/i;
    const quantityPatterns = [/\bqty\s*[:#-]?\s*(\d{1,3})\b/i, /\b(?:quantity|pack(?:\s*size)?)\s*[:#-]?\s*(\d{1,3})\b/i, /\b(\d{1,3})\s*(?:tablets?|pills?|capsules?|caps)\b/i];
    const helpers = {
      addVariantRow(text: string) {
        if (!variant) return;
        const normalized = text.replace(/\s+/g, " ").trim();
        if (normalized.length < 6 || normalized.length > 220 || fee.test(normalized)) return;
        const prices = [...new Set(normalized.match(money) ?? [])].map((price) => price.replace(/\s/g, ""));
        if (prices.length !== 1) return;
        const strength = Number(normalized.match(strengthPattern)?.[1]);
        if (!Number.isFinite(strength) || strength !== variant.strengthMg) return;
        const quantityMatch = quantityPatterns.map((pattern) => normalized.match(pattern)).find(Boolean);
        const gridQuantity = normalized.match(/\b\d{1,3}(?:\.\d+)?\s*mg\b.*?\b(\d{1,3})\b(?=\s*\u00a3)/i)?.[1] ?? null;
        const quantity = Number(quantityMatch?.[1] ?? gridQuantity);
        if (!Number.isFinite(quantity) || quantity !== variant.packQuantity) return;
        variantMatches.push({ price: prices[0], evidence: normalized });
      },
    };

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

      let scope = heading.parentElement;
      for (let depth = 0; scope && depth < 8; depth += 1, scope = scope.parentElement) {
        const scopeText = scope.innerText.replace(/\s+/g, " ").trim();
        if ((scopeText.match(money)?.length ?? 0) > 0 && scopeText.length < 6000) {
          for (const row of scope.querySelectorAll("tr,[role='row'],li,div")) {
            helpers.addVariantRow((row as HTMLElement).innerText ?? "");
          }
          break;
        }
      }
    }

    if (variant && variantMatches.length === 0) {
      for (const token of tokens) {
        for (const element of document.querySelectorAll("section,article,div")) {
          const text = ((element as HTMLElement).innerText ?? "").replace(/\s+/g, " ").trim();
          const lower = text.toLowerCase();
          if (text.length > 2500 || !lower.startsWith(token) || !/dose\s+usage\s+qty\s+price/i.test(text)) continue;
          for (const row of element.querySelectorAll("tr,[role='row'],li,div")) {
            helpers.addVariantRow((row as HTMLElement).innerText ?? "");
          }
          if (variantMatches.length > 0) break;
        }
        if (variantMatches.length > 0) break;
      }
    }

    if (variant && variantMatches.length === 0 && primaryToken) {
      const sectionPattern = new RegExp(`${primaryToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+generic\\s+dose\\s+usage\\s+qty\\s+price`, "i");
      const bodyText = document.body.innerText.replace(/\s+/g, " ").trim();
      const sectionStart = bodyText.search(sectionPattern);
      if (sectionStart >= 0) {
        const remaining = bodyText.slice(sectionStart);
        const nextSection = remaining.slice(primaryToken.length + 1).search(/\b[A-Z][A-Za-z ()]+\s+GENERIC\s+DOSE\s+USAGE\s+QTY\s+PRICE\b/);
        const sectionText = nextSection >= 0 ? remaining.slice(0, primaryToken.length + 1 + nextSection) : remaining;
        for (const row of sectionText.matchAll(/\b\d{1,3}(?:\.\d+)?mg\b\s+(?:On-Demand|Daily)\s+\d{1,3}\s+\u00a3\s*\d+(?:\.\d{2})?/gi)) {
          const normalized = row[0].replace(/\s+/g, " ").trim();
          const price = normalized.match(money)?.[0]?.replace(/\s/g, "") ?? null;
          const strength = Number(normalized.match(strengthPattern)?.[1]);
          const quantity = Number(normalized.match(/\b\d{1,3}(?:\.\d+)?\s*mg\b\s+(?:On-Demand|Daily)\s+(\d{1,3})\s+\u00a3/i)?.[1]);
          if (price && strength === variant.strengthMg && quantity === variant.packQuantity) {
            variantMatches.push({ price, evidence: normalized });
          }
        }
      }
    }

    if (variant && variantMatches.length === 0) {
      for (const row of document.querySelectorAll("tr,[role='row'],li,div")) {
        helpers.addVariantRow((row as HTMLElement).innerText ?? "");
      }
    }

    const delivery = new Set<string>();
    for (const element of document.querySelectorAll("p,span,div")) {
      const text = ((element as HTMLElement).innerText ?? "").replace(/\s+/g, " ").trim();
      if (text.length > 160 || !fee.test(text) || /\bfree\b/i.test(text)) continue;
      const prices = text.match(money) ?? [];
      if (prices.length === 1) delivery.add(prices[0].replace(/\s/g, ""));
    }

    if (variant) {
      const uniqueVariantPrices = new Set(variantMatches.map((match) => match.price));
      if (uniqueVariantPrices.size !== 1) return null;
      return {
        price: variantMatches[0].price,
        deliveryPrice: delivery.size === 1 ? [...delivery][0] : null,
        evidence: variantMatches[0].evidence,
      };
    }

    const uniquePrices = new Set(matches.map((match) => match.price));
    if (uniquePrices.size !== 1) return null;
    return {
      price: matches[0].price,
      deliveryPrice: delivery.size === 1 ? [...delivery][0] : null,
      evidence: matches[0].evidence,
    };
  }, { tokens: matchedTokens.map((token) => token.toLowerCase()), variant })
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
    if (!options.humanAssist) options.onProgress?.("Checking the page's structured price data…");
    const page = options.humanAssist ? null : await collectPublicWebsite(url);
    const structured = options.variant || !page ? undefined : pickStructuredPrice(page.html, matchedTokens, page.finalUrl);
    if (structured) return structured;
  } catch (error) {
    if (!(error instanceof Error) || !/robots rules|human-verification|captcha|review (?:it|the page) manually|unexpected content type/i.test(error.message)) throw error;
  }

  const rendered = await collectRenderedProductCard(url, matchedTokens, Boolean(options.humanAssist), options.variant, options.page, options.onProgress);
  if (rendered) return rendered;
  throw new Error(options.variant ? "No matching strength and pack-size GBP price row found for this variant." : "No unambiguous GBP product price found for the confirmed product match.");
}
