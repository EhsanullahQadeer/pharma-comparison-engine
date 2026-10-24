import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { collectPublicWebsite } from "../src/lib/discovery/public-web";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Records each published pharmacy's Trustpilot page as Provider.trustpilotUrl, taken from the link
// the pharmacy itself publishes on its homepage (review widget, footer badge). The homepage is read
// through the same robots-respecting, SSRF-safe fetch the discovery pipeline uses; Trustpilot itself
// is never fetched. A link is only accepted when its Trustpilot page is for the pharmacy's own
// domain, so a parent company's or a partner's page is never attached to the wrong pharmacy.
// Pharmacies whose homepage has no such link fall back to scripts/data/trustpilot-links.json:
// pages found by searching Trustpilot for the pharmacy's exact domain, keyed by websiteDomain.
// Links staff already set are left alone unless --force is passed. Prints only, unless --write.
//
//   npm run pharmacies:fetch-trustpilot                   # dry run: show what would be saved
//   npm run pharmacies:fetch-trustpilot -- --write        # save to pharmacies without a link
//   npm run pharmacies:fetch-trustpilot -- --write --force

const researched: Record<string, string> = JSON.parse(readFileSync(join(import.meta.dirname, "data", "trustpilot-links.json"), "utf8"));

const TRUSTPILOT_REVIEW_LINK = /https?:\/\/(?:[a-z]{2,3}\.|www\.)?trustpilot\.com\/review\/([a-z0-9.-]+)/gi;

const bareDomain = (domain: string) => domain.toLowerCase().replace(/^www\./, "");

function trustpilotUrlFor(html: string, websiteDomain: string) {
  const own = bareDomain(websiteDomain);
  for (const match of html.matchAll(TRUSTPILOT_REVIEW_LINK)) {
    const reviewed = match[1].toLowerCase().replace(/\.+$/, "");
    if (bareDomain(reviewed) === own) return `https://uk.trustpilot.com/review/${reviewed}`;
  }
  return null;
}

async function main() {
  const write = process.argv.includes("--write");
  const force = process.argv.includes("--force");
  const providers = await prisma.provider.findMany({
    where: { status: "PUBLISHED", ...(force ? {} : { trustpilotUrl: null }) },
    select: { id: true, tradingName: true, websiteDomain: true },
    orderBy: { tradingName: "asc" },
  });
  console.log(`Looking for Trustpilot links on ${providers.length} pharmacy homepages${write ? "" : " (dry run)"}…`);

  const missing: string[] = [];
  let found = 0;
  for (const provider of providers) {
    let trustpilotUrl: string | null = null;
    let source = "homepage";
    try {
      const { html } = await collectPublicWebsite(`https://${provider.websiteDomain}`);
      trustpilotUrl = trustpilotUrlFor(html, provider.websiteDomain);
    } catch (error) {
      console.log(`  · ${provider.tradingName}: homepage not read (${error instanceof Error ? error.message : String(error)})`);
    }
    if (!trustpilotUrl && researched[provider.websiteDomain]) {
      trustpilotUrl = researched[provider.websiteDomain];
      source = "researched list";
    }
    if (!trustpilotUrl) {
      missing.push(provider.websiteDomain);
      console.log(`  - ${provider.tradingName}: no Trustpilot page found for ${provider.websiteDomain}`);
      continue;
    }
    if (write) await prisma.provider.update({ where: { id: provider.id }, data: { trustpilotUrl, trustpilotCheckedAt: new Date() } });
    found++;
    console.log(`  ✓ ${provider.tradingName}: ${trustpilotUrl} (${source})`);
  }
  console.log(`${write ? "Saved" : "Found"} ${found} of ${providers.length} Trustpilot links.`);
  if (missing.length > 0) console.log(`No link found for: ${missing.join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
