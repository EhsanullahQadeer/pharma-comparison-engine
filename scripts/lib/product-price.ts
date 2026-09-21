import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

type RenderOptions = {
  humanAssist?: boolean;
};

type RenderedSession = {
  page: Page;
  close: () => Promise<void>;
};

export function pickStructuredPrice(offers: unknown[], tokens: string[]): string | null {
  const prices = new Set<string>();
  for (const value of offers) {
    if (!value || typeof value !== "object") continue;
    const product = value as Record<string, unknown>;
    const types = Array.isArray(product["@type"]) ? product["@type"] : [product["@type"]];
    if (!types.includes("Product") || typeof product.name !== "string") continue;
    const name = product.name.toLowerCase();
    if (!tokens.some(token => name.includes(token.toLowerCase()))) continue;
    const entries = Array.isArray(product.offers) ? product.offers : [product.offers];
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const offer = entry as Record<string, unknown>;
      if (offer.priceCurrency !== "GBP" || !["string", "number"].includes(typeof offer.price)) continue;
      const price = Number(offer.price);
      if (Number.isFinite(price) && price > 0) prices.add(`£${price.toFixed(2)}`);
    }
  }
  return prices.size === 1 ? [...prices][0] : null;
}

// Read only a card with an exact product heading, stopping before a neighbouring
// heading. Never use arbitrary proximity to a medicine mention in the page HTML.
export async function readProductCard(page: Page, tokens: string[]) {
  return page.evaluate((names) => {
    const money = /£\s*\d+(?:\.\d{2})?/g;
    const fee = /postage|packaging|delivery|shipping/i;
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")];
    const matches: { latestPrice: string; priceBasis: string; priceEvidence: string }[] = [];
    for (const heading of headings) {
      if (!names.includes((heading.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase())) continue;
      let card = heading.parentElement;
      for (let depth = 0; card && depth < 6; depth++, card = card.parentElement) {
        if (card.querySelectorAll("h1,h2,h3,h4,h5,h6").length > 1) break;
        const text = card.innerText.replace(/\s+/g, " ").trim();
        if (fee.test(text)) break;
        const prices = [...new Set(text.match(money) ?? [])];
        if (prices.length > 1) break;
        if (prices.length !== 1) continue;
        const unit = text.match(/(?:\/|per\s+)(pill|tablet|capsule)\b/i)?.[1];
        let priceBasis = unit ? `per ${unit.toLowerCase()}` : "unspecified";
        if (/\bfrom\s*£/i.test(text)) priceBasis = `from (${priceBasis})`;
        matches.push({ latestPrice: prices[0].replace(/\s/g, ""), priceBasis, priceEvidence: text });
        break;
      }
    }
    const delivery = new Set<string>();
    for (const element of document.querySelectorAll("p,span,div")) {
      const text = ((element as HTMLElement).innerText ?? "").replace(/\s+/g, " ").trim();
      if (text.length > 160 || !fee.test(text)) continue;
      if (/\bfree\b/i.test(text)) continue;
      const prices = text.match(money) ?? [];
      if (prices.length === 1) delivery.add(prices[0].replace(/\s/g, ""));
    }
    const uniquePrices = new Set(matches.map(match => match.latestPrice));
    const result = uniquePrices.size === 1 ? matches[0] : null;
    return { latestPrice: result?.latestPrice ?? null, priceBasis: result?.priceBasis ?? null,
      priceEvidence: result?.priceEvidence ?? null,
      deliveryPrice: delivery.size === 1 ? [...delivery][0] : null };
  }, tokens.map(token => token.toLowerCase()));
}

export async function collectRenderedPrice(url: string, tokens: string[], options: RenderOptions = {}) {
  const { page, close } = await collectRenderedPage(url, 12_000, options);
  try {
    const deadline = Date.now() + 12_000;
    let result = await readProductCard(page, tokens);
    while (!result.latestPrice && Date.now() < deadline) {
      await handleVerificationPage(page, options);
      await page.waitForTimeout(750);
      result = await readProductCard(page, tokens);
    }
    return { ...result, priceSource: result.latestPrice ? "rendered-product-card" : null };
  } finally {
    await close();
  }
}

async function collectRenderedPage(url: string, timeout: number, options: RenderOptions): Promise<RenderedSession> {
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  try {
    if (options.humanAssist) {
      const userDataDir = join(process.cwd(), "tmp", "ed-price-human-browser");
      mkdirSync(userDataDir, { recursive: true });
      context = await chromium.launchPersistentContext(userDataDir, { headless: false, viewport: null });
    } else {
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext();
    }
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      await handleVerificationPage(page, options);
      if ((await page.locator("body").innerText()).trim()) {
        return { page, close: async () => { await context?.close(); await browser?.close(); } };
      }
      await page.waitForTimeout(500);
    }
    return { page, close: async () => { await context?.close(); await browser?.close(); } };
  } catch (error) {
    await context?.close();
    await browser?.close();
    throw error;
  }
}

async function handleVerificationPage(page: Page, options: RenderOptions) {
  const bodyText = await page.locator("body").innerText();
  if (!/verify you are human|checking your browser|captcha|recaptcha|hcaptcha/i.test(bodyText)) return;
  if (!options.humanAssist) throw new Error("Rendered page requires manual verification.");
  const rl = createInterface({ input, output });
  try {
    await rl.question(`Manual verification needed for ${page.url()}. Complete it in the browser, then press Enter here to continue.`);
  } finally {
    rl.close();
  }
}

export async function collectRenderedPageSignals(url: string, tokens: string[], options: RenderOptions = {}) {
  const { page, close } = await collectRenderedPage(url, 8_000, options);
  try {
    const base = new URL(page.url());
    const [{ html, links }, pricing] = await Promise.all([
      page.evaluate(() => ({
        html: document.documentElement.outerHTML,
        links: [...document.querySelectorAll("a[href]")].map((anchor) => (anchor as HTMLAnchorElement).href),
      })),
      readProductCard(page, tokens),
    ]);
    const sameOriginLinks = [...new Set(links.filter((href) => {
      try {
        return new URL(href).hostname === base.hostname;
      } catch {
        return false;
      }
    }))];
    return { finalUrl: base.href, html, candidateUrls: sameOriginLinks, pricing: { ...pricing, priceSource: pricing.latestPrice ? "rendered-product-card" : null } };
  } finally {
    await close();
  }
}
