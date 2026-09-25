import type { ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { brandSideMatches, labelMatchesVariant, type VariantSpec } from "@/lib/price-collection/variant-label";

import type { Page } from "patchright";

// Treated-style "Price checker" (uk.treated.com product pages): a Strength list whose items the page
// listens to, and a Quantity list it refills (via its own price endpoint) for the chosen strength,
// each row `<span class="quantity">4 Tablets</span> … <strong data-price="43.95">`. Only the default
// strength's rows are in the page on load, so the exact strength is chosen the same way a visitor's
// click would, then the refilled rows are read. Browser-only (needs the page's scripts).

// The page renders the checker more than once (desktop + mobile copies); the first is used.
const CHECKER = ".single-price-checker";
const STRENGTHS = ".single-doses-list li";
const QUANTITIES = ".single-doses-price-list li";

// Treated sells "Viagra" and "Sildenafil" as separate pages with separate prices, so the page name
// decides the branded/generic side (brandSideMatches), then must carry an ingredient/brand token.
function pageToken(name: string, matchedTokens: string[], variant: VariantSpec) {
  if (!brandSideMatches(name, "", matchedTokens[0], variant.generic)) return undefined;
  return matchedTokens.find((token) => name.toLowerCase().includes(token.toLowerCase()));
}

export async function readPriceCheckerDropdown(page: Page, matchedTokens: string[], variant: VariantSpec): Promise<Omit<ScrapedPrice, "sourceUrl" | "source"> | undefined> {
  const checker = page.locator(CHECKER).first();
  if ((await checker.locator(STRENGTHS).count()) === 0) return undefined;
  const name = (await page.locator("h1").first().innerText().catch(() => "")).trim();
  const token = pageToken(name, matchedTokens, variant);
  if (!token) return undefined;

  const strengths = await checker.locator(STRENGTHS).evaluateAll((items) => items.map((item) => ({
    text: (item.querySelector(".quantity")?.textContent ?? item.textContent ?? "").trim(),
    active: item.classList.contains("active"),
  })));
  const wanted = strengths
    .map((strength, index) => ({ ...strength, index, mg: Number(strength.text.match(/(\d+(?:\.\d+)?)\s*mg/i)?.[1]) }))
    .filter((strength) => strength.mg === variant.strengthMg);
  if (wanted.length !== 1) return undefined;
  const [target] = wanted;

  // Choose the strength unless it is already the one shown, then wait for the quantity rows to change.
  if (!target.active) {
    const quantities = checker.locator(QUANTITIES);
    const before = await quantities.evaluateAll((rows) => rows.map((row) => row.textContent).join("|"));
    await checker.locator(STRENGTHS).nth(target.index).evaluate((item) => (item as HTMLElement).click());
    await page.waitForFunction(
      ({ selector, previous }) => [...(document.querySelector(selector.checker)?.querySelectorAll(selector.rows) ?? [])].map((row) => row.textContent).join("|") !== previous,
      { selector: { checker: CHECKER, rows: QUANTITIES }, previous: before },
      { timeout: 15_000 },
    ).catch(() => undefined);
    await page.waitForTimeout(500);
  }

  const rows = await checker.locator(QUANTITIES).evaluateAll((items) => items.map((item) => ({
    quantity: (item.querySelector(".quantity")?.textContent ?? "").replace(/\s+/g, " ").trim(),
    price: item.querySelector(".price strong")?.getAttribute("data-price") ?? "",
    outOfStock: /out of stock/i.test(item.textContent ?? ""),
  })));
  const matches = rows
    .filter((row) => labelMatchesVariant(`${token} ${target.text} ${row.quantity.replace(/out of stock/i, "")}`, matchedTokens, variant))
    .map((row) => ({ ...row, pence: Math.round(Number(row.price) * 100) }))
    .filter((row) => Number.isFinite(row.pence) && row.pence > 0);
  if (new Set(matches.map((match) => match.pence)).size !== 1) return undefined;
  const [match] = matches;
  return {
    itemPricePence: match.pence,
    deliveryFeePence: 0,
    deliveryAssumption: "As shown on the provider's price checker at collection time",
    availability: match.outOfStock ? "OUT_OF_STOCK" : "IN_STOCK",
    evidence: `${name}: ${target.text} ${match.quantity}`,
  };
}
