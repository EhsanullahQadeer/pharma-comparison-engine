import { robotsAllows } from "@/lib/discovery/public-web-policy";
import { waitForHumanVerification } from "@/lib/price-collection/human-browser";

import type { Page } from "patchright";

// For sites whose robots.txt sits behind a human-verification check (plain requests only get the
// challenge page): read the rules in the browser — after the check is cleared, by a person in the
// visible window when `humanAssist` — and refuse the page if they don't permit it. The refusal is
// worded "robots rules" so every caller treats it as final, never as something to escalate.
export async function assertRobotsAllowInBrowser(page: Page, url: string, humanAssist: boolean, onWaiting?: (elapsedSeconds: number) => void) {
  const target = new URL(url);
  await page.goto(new URL("/robots.txt", target.origin).href, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await waitForHumanVerification(page, humanAssist, onWaiting);
  const rules = await page.locator("body").innerText();
  if (!robotsAllows(rules, target.pathname)) {
    throw new Error("Collection stopped: robots rules (read in the browser) do not permit this page.");
  }
}
