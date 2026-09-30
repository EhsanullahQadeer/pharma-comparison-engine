import { chromium, type Page } from "patchright";

import { collectPublicWebsite, ROBOTS_BEHIND_CHALLENGE } from "@/lib/discovery/public-web";
import { pickBigCommercePrice } from "@/lib/price-collection/bigcommerce-price";
import { openHumanBrowser, waitForHumanVerification } from "@/lib/price-collection/human-browser";
import { pickNextDataVariantPrice } from "@/lib/price-collection/next-data-variant-price";
import { pickPerTabletPriceTable } from "@/lib/price-collection/per-tablet-price-table";
import { pickPharmacyPluginPrice } from "@/lib/price-collection/pharmacy-plugin-price";
import { readPriceCheckerDropdown } from "@/lib/price-collection/price-checker-dropdown";
import { pickPriceGridTable } from "@/lib/price-collection/price-grid-table";
import { pickPriceTableColumns } from "@/lib/price-collection/price-table-columns";
import { assertRobotsAllowInBrowser } from "@/lib/price-collection/robots-in-browser";
import { pickSelectOptionPrice } from "@/lib/price-collection/select-option-prices";
import { pickShopifyMetaPrice } from "@/lib/price-collection/shopify-meta-price";
import { brandSideMatches, labelMatchesVariant, otcProductMismatch, preferPrescriptionLabels, type VariantSpec } from "@/lib/price-collection/variant-label";
import { pickWooCommercePrice } from "@/lib/price-collection/woocommerce-price";
import { passPostcodePrompt } from "@/lib/product-detection/browser-shop-pages";

export type ScrapedPrice = {
  itemPricePence: number;
  deliveryFeePence: number;
  deliveryAssumption: string;
  availability: "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";
  sourceUrl: string;
  evidence?: string;
  source: "merchant-feed" | "json-ld-product-offer" | "bigcommerce-page-data" | "woocommerce-variation-data" | "pharmacy-plugin-price-list" | "next-data-variants" | "per-tablet-price-table" | "shopify-product-meta" | "price-grid-table" | "price-table-columns" | "select-option-data" | "price-checker-dropdown" | "rendered-product-card";
};

type ScrapeProductPriceOptions = {
  matchedTokens?: string[];
  humanAssist?: boolean;
  page?: Page;
  variant?: VariantSpec;
  /** The pharmacy's own postcode, for shops that ask for one before showing a product. */
  postcode?: string;
  /** Reports coarse step text (e.g. "Rendering the page…") as scraping progresses. */
  onProgress?: (message: string) => void;
};

function extractJsonLdBlocks(html: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [];
  for (const match of html.matchAll(/<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed: unknown = JSON.parse(match[1].trim());
      for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
        if (!node || typeof node !== "object") continue;
        const record = node as Record<string, unknown>;
        // Yoast/WooCommerce-style pages wrap every entity in a single @graph array; product listings
        // (e.g. Boots' ED page) put each product in an ItemList, directly or inside a ListItem.
        const graph = Array.isArray(record["@graph"]) ? record["@graph"] : [record];
        for (const entry of graph) {
          if (!entry || typeof entry !== "object") continue;
          const node = entry as Record<string, unknown>;
          blocks.push(node);
          for (const item of Array.isArray(node.itemListElement) ? node.itemListElement : []) {
            const listed = item && typeof item === "object" ? ((item as Record<string, unknown>).item ?? item) : undefined;
            if (listed && typeof listed === "object") blocks.push(listed as Record<string, unknown>);
          }
        }
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

// Whether a page title/heading names any compared product at all.
const PRODUCT_NAME = /\b(?:viagra|sildenafil|cialis|tadalafil)\b/i;

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

function asRecords(value: unknown): Record<string, unknown>[] {
  const list = Array.isArray(value) ? value : [value];
  return list.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
}

function textField(node: Record<string, unknown>, key: string): string {
  const value = node[key];
  return typeof value === "string" ? value : "";
}

// Variant-aware JSON-LD read: every Product (plus a ProductGroup's hasVariant children) and each of
// its offers is labelled "product name + offer name + sku", and only offers whose label names this
// exact strength and pack size count. Like the other steps, it needs every matching GBP offer to
// agree on one price; otherwise it returns nothing and the browser step reads the page instead.
function pickStructuredVariantPrice(html: string, matchedTokens: string[], variant: NonNullable<ScrapeProductPriceOptions["variant"]>, sourceUrl: string): ScrapedPrice | undefined {
  const products = extractJsonLdBlocks(html)
    .flatMap((block) => [block, ...asRecords(block.hasVariant)])
    .filter((node) => hasType(node, "Product"));
  const matches: { itemPricePence: number; availability: ScrapedPrice["availability"]; evidence: string }[] = [];
  for (const product of products) {
    const offers = asRecords(product.offers).flatMap((offer) => (hasType(offer, "AggregateOffer") ? asRecords(offer.offers) : [offer]));
    for (const offer of offers) {
      if (offer.priceCurrency !== "GBP") continue;
      const label = [textField(product, "name"), textField(offer, "name"), textField(offer, "sku") || textField(product, "sku")].filter(Boolean).join(" ");
      if (!brandSideMatches(textField(product, "name"), textField(offer, "name"), matchedTokens[0], variant.generic)) continue;
      if (!labelMatchesVariant(label, matchedTokens, variant)) continue;
      const itemPricePence = toPence(offer.price);
      if (itemPricePence === undefined) continue;
      const availability = typeof offer.availability === "string" ? (availabilityMap[offer.availability] ?? "UNKNOWN") : "UNKNOWN";
      matches.push({ itemPricePence, availability, evidence: label });
    }
  }
  const preferred = preferPrescriptionLabels(matches, (match) => match.evidence);
  if (new Set(preferred.map((match) => match.itemPricePence)).size !== 1) return undefined;
  return {
    ...preferred[0],
    deliveryFeePence: 0,
    deliveryAssumption: "As shown on the provider's product page at collection time",
    sourceUrl,
    source: "json-ld-product-offer",
  };
}

// A shop platform's own price data embedded in the page (WooCommerce variations, a pharmacy
// plugin's price list, Next.js/Shopify variant lists, price tables), for the exact variant only.
function pickEmbeddedVariantPrice(html: string, matchedTokens: string[], variant: VariantSpec, sourceUrl: string): ScrapedPrice | undefined {
  return pickWooCommercePrice(html, matchedTokens, variant, sourceUrl)
    ?? pickPharmacyPluginPrice(html, matchedTokens, variant, sourceUrl)
    ?? pickNextDataVariantPrice(html, matchedTokens, variant, sourceUrl)
    ?? pickPerTabletPriceTable(html, matchedTokens, variant, sourceUrl)
    ?? pickShopifyMetaPrice(html, matchedTokens, variant, sourceUrl)
    ?? pickPriceGridTable(html, matchedTokens, variant, sourceUrl)
    ?? pickPriceTableColumns(html, matchedTokens, variant, sourceUrl)
    ?? pickSelectOptionPrice(html, matchedTokens, variant, sourceUrl);
}

// Every reader that works from a page's HTML alone, for one exact variant: schema.org data first,
// then embedded platform data. Shared by price collection and product detection's per-variant check.
export function pickPageVariantPrice(html: string, matchedTokens: string[], variant: VariantSpec, sourceUrl: string): ScrapedPrice | undefined {
  return pickStructuredVariantPrice(html, matchedTokens, variant, sourceUrl)
    ?? pickEmbeddedVariantPrice(html, matchedTokens, variant, sourceUrl)
    ?? pickBigCommercePrice(html, matchedTokens, variant, sourceUrl);
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

async function collectRenderedProductCard(url: string, matchedTokens: string[], humanAssist: boolean, variant?: ScrapeProductPriceOptions["variant"], existingPage?: Page, onProgress?: (message: string) => void, checkRobotsInBrowser = false, postcode?: string): Promise<ScrapedPrice | undefined> {
  const humanBrowser = !existingPage && humanAssist ? await openHumanBrowser() : undefined;
  const browserContext = existingPage?.context() ?? humanBrowser?.page.context() ?? await chromium.launch({ headless: true }).then((browser) => browser.newContext());
  if (!browserContext) throw new Error("Could not open the price collection browser.");
  const browser = browserContext.browser();
  const onWaiting = onProgress ? (elapsedSeconds: number) => onProgress(`Still waiting for verification… (${elapsedSeconds}s elapsed)`) : undefined;
  try {
    const page = existingPage ?? humanBrowser?.page ?? await browserContext.newPage();
    if (checkRobotsInBrowser) {
      onProgress?.("Reading the site's robots.txt in the browser…");
      await assertRobotsAllowInBrowser(page, url, humanAssist, onWaiting);
    }
    if (page.url() !== url) {
      onProgress?.("Opening the product page…");
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    }
    await waitForHumanVerification(page, humanAssist, onWaiting);
    // Shops that show nothing until a postcode is entered (e.g. Oxford e-Pharmacy's marketplace).
    await passPostcodePrompt(page, postcode);
    // Pages only reachable in the browser (e.g. behind a Cloudflare check) still carry their
    // platform's embedded price data — read that before falling back to the visible card.
    const html = await page.content();
    const embedded = (variant ? pickEmbeddedVariantPrice(html, matchedTokens, variant, page.url()) : undefined)
      ?? pickBigCommercePrice(html, matchedTokens, variant, page.url());
    if (embedded) return embedded;
    // A price checker that only loads the chosen strength's packs on selection (e.g. Treated).
    const checker = variant ? await readPriceCheckerDropdown(page, matchedTokens, variant) : undefined;
    if (checker) return { ...checker, sourceUrl: page.url(), source: "price-checker-dropdown" };
    // Rendered rows are matched on strength and pack alone, so the page itself must be about the
    // right product: a "Cialis Together" page's "10mg 4 Tablets £19.99" is not prescription Cialis.
    // Only a title/heading that names a product counts ("Product details" says nothing either way),
    // and the matched row's own text is checked the same way below.
    const pageName = `${await page.title()} ${await page.locator("h1").first().innerText({ timeout: 2_000 }).catch(() => "")}`;
    if (variant && PRODUCT_NAME.test(pageName) && otcProductMismatch(pageName, matchedTokens)) return undefined;
    // The rendered readers match strength and pack only, so the row (with the page title) must also
    // be the right product and side: "Perrigo Sildenafil 50mg … (4)" is generic, never branded Viagra.
    const rightProduct = (evidence: string | undefined) => !variant || (
      !otcProductMismatch(evidence ?? "", matchedTokens)
      && brandSideMatches("", `${evidence ?? ""} ${pageName}`, matchedTokens[0], variant.generic)
    );
    onProgress?.("Reading the rendered page for a price card…");
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      await waitForHumanVerification(page, humanAssist, onWaiting);
      const result = await readRenderedCard(page, matchedTokens, variant);
      if (result && rightProduct(result.evidence)) return { ...result, sourceUrl: page.url(), source: "rendered-product-card" };
      if (variant) {
        const textResult = readVariantFromRenderedText(await page.locator("body").innerText(), matchedTokens, variant);
        if (textResult && rightProduct(textResult.evidence)) return { ...textResult, sourceUrl: page.url(), source: "rendered-product-card" };
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
    // A stated tablet count wins over "Quantity N": product cards often carry a basket quantity
    // selector ("… 4 Tablets Price £19.99 Quantity 1 Add" on Oxford e-Pharmacy).
    const quantityPatterns = [/\b(\d{1,3})\s*(?:tablets?|pills?|capsules?|caps)\b/i, /\b(?:tablets?|capsules?)\s*\((\d{1,3})\)/i, /\bqty\s*[:#-]?\s*(\d{1,3})\b/i, /\b(?:quantity|pack(?:\s*size)?)\s*[:#-]?\s*(\d{1,3})\b/i];
    const helpers = {
      addVariantRow(text: string) {
        if (!variant) return;
        const normalized = text.replace(/\s+/g, " ").trim();
        if (normalized.length < 6 || normalized.length > 220 || fee.test(normalized)) return;
        const prices = [...new Set(normalized.match(money) ?? [])].map((price) => price.replace(/\s/g, ""));
        if (prices.length !== 1) return;
        // A row naming several products or strengths (e.g. a trial pack: "Sildenafil 50mg x 4
        // tablets, Tadalafil 10mg x 4 tablets and …") is not one variant's price.
        const strengths = [...normalized.matchAll(/\b(\d{1,3}(?:\.\d+)?)\s*mg\b/gi)].map((match) => Number(match[1]));
        if (new Set(strengths).size > 1 || /\b(?:trial|bundle|mixed)\b/i.test(normalized)) return;
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

  // A plain request is tried first even in human-assist mode — the browser (and any verification
  // the admin has to complete in it) is only needed when that request is blocked or finds nothing.
  // When robots.txt itself is behind a check, its rules are read in the browser before the page.
  let checkRobotsInBrowser = false;
  try {
    options.onProgress?.("Checking the page's structured price data…");
    const page = await collectPublicWebsite(url);
    const structured = options.variant
      ? pickPageVariantPrice(page.html, matchedTokens, options.variant, page.finalUrl)
      : pickStructuredPrice(page.html, matchedTokens, page.finalUrl) ?? pickBigCommercePrice(page.html, matchedTokens, undefined, page.finalUrl);
    if (structured) return structured;
  } catch (error) {
    // A robots refusal is final — never retried in a browser, visible or not.
    if (!(error instanceof Error) || /robots rules/i.test(error.message)) throw error;
    if (!/human-verification|captcha|review (?:it|the page) manually|unexpected content type/i.test(error.message)) throw error;
    checkRobotsInBrowser = error.message === ROBOTS_BEHIND_CHALLENGE;
  }

  const rendered = await collectRenderedProductCard(url, matchedTokens, Boolean(options.humanAssist), options.variant, options.page, options.onProgress, checkRobotsInBrowser, options.postcode);
  if (rendered) return rendered;
  throw new Error(options.variant ? "No matching strength and pack-size GBP price row found for this variant." : "No unambiguous GBP product price found for the confirmed product match.");
}
