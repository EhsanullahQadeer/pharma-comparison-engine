import axe, { type AxeResults } from "axe-core";
import { chromium, type Browser, type Page } from "patchright";

import { publicRoutes } from "@/lib/ed-pages";

// Milestone 8 accessibility check: runs axe (WCAG 2.0–2.2 A/AA rules) over every public route in
// the page catalogue, a few pharmacy profiles, a filtered comparison, the 404 page and the staff
// login, in light and dark mode. Exits non-zero on any serious or critical violation.
//   npm run test:a11y                         (against http://localhost:3000)
//   A11Y_BASE_URL=https://staging.example npm run test:a11y
const baseUrl = (process.env.A11Y_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const blocking = new Set(["serious", "critical"]);

type Finding = { impact: string; help: string; helpUrl: string; pages: Map<string, string> };

async function pharmacyProfiles(browser: Browser) {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/ed/pharmacies`, { waitUntil: "networkidle" });
  const hrefs = await page.locator('main a[href^="/ed/pharmacies/"]').evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
  await page.close();
  return [...new Set(hrefs.filter((href) => /^\/ed\/pharmacies\/[a-z0-9-]+$/.test(href) && href !== "/ed/pharmacies/partners"))].slice(0, 3);
}

// Injects axe-core into the page and runs only the WCAG-tagged rules. patchright evaluates in an
// isolated world by default, where the injected `window.axe` is invisible — hence `false`.
async function runAxe(page: Page) {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate((tags) => (window as unknown as { axe: typeof axe }).axe.run({ runOnly: { type: "tag", values: tags } }), wcagTags, undefined, false) as Promise<AxeResults>;
}

async function main() {
  const browser = await chromium.launch();
  const routes = [
    ...new Set(publicRoutes.map((route) => route.href)),
    "/ed/compare?medicine=sildenafil&type=generic",
    "/ed/compare?view=list",
    ...(await pharmacyProfiles(browser)),
    "/this-page-does-not-exist",
    "/admin/login",
    "/partner/login",
  ];
  const findings = new Map<string, Finding>();
  let scanned = 0;

  for (const colorScheme of ["light", "dark"] as const) {
    // Reduced motion shows scroll-reveal content immediately, so nothing is scanned mid-fade.
    const context = await browser.newContext({ colorScheme, reducedMotion: "reduce", viewport: { width: 1366, height: 900 } });
    for (const route of routes) {
      // A fresh tab per route, so scroll position or state left by the previous page can't
      // change what axe sees (a link under the sticky header reads as a target-size failure).
      const page = await context.newPage();
      await page.goto(baseUrl + route, { waitUntil: "networkidle" });
      const { violations } = await runAxe(page);
      await page.close();
      scanned += 1;
      for (const violation of violations) {
        const finding = findings.get(violation.id) ?? { impact: violation.impact ?? "unknown", help: violation.help, helpUrl: violation.helpUrl, pages: new Map() };
        finding.pages.set(`${route} (${colorScheme})`, `${violation.nodes.length}× e.g. ${violation.nodes[0]?.target.join(" ")}`);
        findings.set(violation.id, finding);
      }
    }
    await context.close();
  }
  await browser.close();

  console.warn(`Scanned ${scanned} page views (${routes.length} routes × light/dark) against ${baseUrl}.`);
  const sorted = [...findings].sort(([, a], [, b]) => Number(blocking.has(b.impact)) - Number(blocking.has(a.impact)) || b.pages.size - a.pages.size);
  for (const [id, finding] of sorted) {
    console.warn(`\n[${finding.impact}] ${id}: ${finding.help} (${finding.pages.size} page views)\n  ${finding.helpUrl}`);
    for (const [where, detail] of [...finding.pages].slice(0, 5)) console.warn(`  - ${where}: ${detail}`);
    if (finding.pages.size > 5) console.warn(`  - …and ${finding.pages.size - 5} more`);
  }
  const blockingCount = sorted.filter(([, finding]) => blocking.has(finding.impact)).length;
  console.warn(`\n${findings.size} rule(s) violated, ${blockingCount} serious/critical.`);
  if (blockingCount > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
