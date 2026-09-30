import { robotsAllows } from "@/lib/discovery/public-web-policy";
import { waitForHumanVerification } from "@/lib/price-collection/human-browser";

import type { Page } from "patchright";

// Reads an origin's robots.txt in the browser — after its human-verification check is cleared, by a
// person in the visible window when `humanAssist`. Returned as text for robotsAllows.
export async function readRobotsInBrowser(page: Page, origin: string, humanAssist: boolean, onWaiting?: (elapsedSeconds: number) => void) {
  await page.goto(new URL("/robots.txt", origin).href, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await waitForHumanVerification(page, humanAssist, onWaiting);
  return page.locator("body").innerText();
}

// For sites whose robots.txt sits behind a human-verification check (plain requests only get the
// challenge page): refuse the page if the rules read in the browser don't permit it. The refusal is
// worded "robots rules" so every caller treats it as final, never as something to escalate.
export async function assertRobotsAllowInBrowser(page: Page, url: string, humanAssist: boolean, onWaiting?: (elapsedSeconds: number) => void) {
  const target = new URL(url);
  const rules = await readRobotsInBrowser(page, target.origin, humanAssist, onWaiting);
  if (!robotsAllows(rules, target.pathname + target.search)) {
    throw new Error("Collection stopped: robots rules (read in the browser) do not permit this page.");
  }
}
