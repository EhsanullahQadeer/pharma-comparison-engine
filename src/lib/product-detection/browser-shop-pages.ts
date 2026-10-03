import { ignoreNavigationRace } from "@/lib/browser/navigation-race";
import { isSameSite } from "@/lib/product-detection/detect-products";
import { edTokenPattern, isEdCategoryRootPath } from "@/lib/product-detection/ed-tokens";
import type { PageLink } from "@/types/product-detection";

import type { Page } from "patchright";

// Page-level steps for storefronts that only show their products after interaction — verified live
// on a Healthera-run shop (app.oxforde-pharmacy.co.uk): a postcode prompt hides the catalogue,
// categories are clickable labels, and product cards navigate on click with no <a href>.

const edCategoryNamePattern = /^\s*(?:erectile dysfunction(?:\s*\(ed\))?|ed(?: treatments?)?)\s*$/i;
const shopLinkTextPattern = /^\s*(?:pharmacy |online )?shop(?: now| online| all)?\s*$|^\s*view (?:all )?products\s*$|^\s*marketplace\s*$/i;
const shopPathSegments = new Set(["shop", "store", "marketplace", "products", "online-shop"]);
const categoryQueryKeyPattern = /categor|collection|condition|filter|tag/i;
const ukPostcodePattern = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/;

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// An ED category listing: "/erectile-dysfunction", "?category=Erectile+Dysfunction", or a link
// labelled with the category name. Only category-style query keys count — a product page's
// "&from=Erectile+Dysfunction" breadcrumb is not a listing.
export function isEdCategoryLink(link: PageLink): boolean {
  const url = new URL(link.url);
  if (isEdCategoryRootPath(url.pathname)) return true;
  if ([...url.searchParams].some(([key, value]) => categoryQueryKeyPattern.test(key) && normalized(value).includes("erectiledysfunction"))) return true;
  return edCategoryNamePattern.test(link.text.replace(/\s+/g, " "));
}

// The pharmacy's shop entry point ("Pharmacy Shop", "/marketplace") — where ED categories live when
// the homepage doesn't link to one.
export function isShopLink(link: PageLink): boolean {
  const segments = new URL(link.url).pathname.split("/").filter(Boolean).map((segment) => segment.toLowerCase());
  return shopLinkTextPattern.test(link.text.replace(/\s+/g, " ")) || (segments.length === 1 && shopPathSegments.has(segments[0]));
}

// textContent (not innerText) so names in collapsed menus still count. Plain-http links (a
// homepage's "Pharmacy Shop" button, say) are read as https, the only scheme collection opens.
export async function readRenderedLinks(page: Page, siteHostname: string): Promise<PageLink[]> {
  const links = await ignoreNavigationRace(() => page.locator("a[href]").evaluateAll((elements) => elements.map((element) => ({
    url: (element as HTMLAnchorElement).href,
    text: element.textContent ?? "",
  }))), []);
  return links.flatMap((link) => {
    try {
      const url = new URL(link.url);
      if (!/^https?:$/.test(url.protocol) || !isSameSite(url.hostname, siteHostname)) return [];
      url.protocol = "https:";
      url.hash = "";
      return [{ url: url.href, text: link.text }];
    } catch {
      return [];
    }
  });
}

// Shops that ask "Enter your postcode" before listing anything get the pharmacy's own postcode —
// the known one, else the first UK postcode the page itself shows (usually its footer address).
export async function passPostcodePrompt(page: Page, knownPostcode?: string) {
  const input = page.locator('input[id*="postcode" i]:visible, input[name*="postcode" i]:visible, input[placeholder*="postcode" i]:visible').first();
  if (!await input.isVisible().catch(() => false)) return;
  const postcode = knownPostcode ?? (await page.locator("body").innerText()).match(ukPostcodePattern)?.[0];
  if (!postcode) return;
  await input.fill(postcode);
  const submit = input.locator("xpath=ancestor::form[1]").locator('button[type="submit"], input[type="submit"]').first();
  if (await submit.isVisible().catch(() => false)) await submit.click({ timeout: 5_000 }).catch(() => undefined);
  else await input.press("Enter");
  await page.waitForTimeout(3_000);
  // The prompt can stay open over the now-filtered catalogue.
  if (await input.isVisible().catch(() => false)) await page.keyboard.press("Escape");
  await page.waitForTimeout(1_000);
}

// Opens an ED category shown as a clickable label/button rather than a link. True when something
// was clicked (the caller then reads the page as an ED listing).
export async function openEdCategoryByClick(page: Page) {
  const category = page.getByText(edCategoryNamePattern).first();
  if (!await category.isVisible().catch(() => false)) return false;
  await category.click({ timeout: 5_000 }).catch(() => undefined);
  await page.waitForTimeout(3_000);
  return true;
}

// Visible product names carrying an ED token on clickable elements that aren't links/buttons —
// cards that navigate in script. Only the element's own text counts, so a whole card grid
// never reads as one name. One entry per card: two cards can show the same name, so repeats are
// kept and clicked by position.
async function clickableEdNames(page: Page): Promise<string[]> {
  return ignoreNavigationRace(() => page.locator("body").evaluate((body, pattern) => {
    const token = new RegExp(pattern, "i");
    const found: string[] = [];
    for (const element of body.querySelectorAll("*")) {
      if (element.closest("a, button, label, input, select, textarea, header, footer, nav")) continue;
      const own = [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent ?? "").join(" ").replace(/\s+/g, " ").trim();
      if (!own || own.length > 200 || !token.test(own)) continue;
      if (getComputedStyle(element).cursor === "pointer") found.push(own);
    }
    return found;
  }, edTokenPattern.source), []);
}

// Clicks each ED product card on the current listing, records where it leads, and returns to the
// listing. A click that doesn't navigate (a quick-view popup, say) is closed and skipped.
export async function clickThroughEdProductCards(page: Page, maxCards: number, knownPostcode?: string): Promise<PageLink[]> {
  const listingUrl = page.url();
  const found: PageLink[] = [];
  const seen = new Map<string, number>();
  for (const name of (await clickableEdNames(page)).slice(0, maxCards)) {
    const position = seen.get(name) ?? 0;
    seen.set(name, position + 1);
    // After returning from a product page the listing re-renders a moment later.
    const card = page.getByText(name, { exact: true }).nth(position);
    if (!await card.waitFor({ state: "visible", timeout: 10_000 }).then(() => true, () => false)) continue;
    await card.click({ timeout: 5_000 }).catch(() => undefined);
    await page.waitForURL((url) => url.href !== listingUrl, { timeout: 5_000 }).catch(() => undefined);
    if (page.url() === listingUrl) {
      await page.keyboard.press("Escape");
      continue;
    }
    found.push({ url: page.url(), text: name });
    await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => undefined);
    if (page.url() !== listingUrl) await page.goto(listingUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await passPostcodePrompt(page, knownPostcode);
  }
  return found;
}
