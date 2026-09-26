import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { providerSlug } from "../src/lib/comparison";
import { collectPublicWebsite } from "../src/lib/discovery/public-web";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Downloads each published pharmacy's own site icon into public/pharmacy-logos and records it as
// Provider.logoUrl, so the public site serves logos itself (no visitor request ever goes to a
// third party). The homepage is read through the same robots-respecting, SSRF-safe fetch the
// discovery pipeline uses. Logos staff already set are left alone unless --force is passed.
//
//   npm run pharmacies:fetch-logos            # published pharmacies without a logo
//   npm run pharmacies:fetch-logos -- --force # re-fetch every published pharmacy

const OUTPUT_DIR = join(process.cwd(), "public", "pharmacy-logos");
const MAX_BYTES = 1_000_000;
const extensionByType: Record<string, string> = {
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

type IconCandidate = { href: string; score: number };

function attribute(tag: string, name: string) {
  return tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
}

// Apple touch icons are usually a clean square logo at 180px, so they rank first; then the
// largest declared icon (SVG counts as largest); favicon.ico is the last resort.
function iconCandidates(html: string, baseUrl: string): IconCandidate[] {
  const candidates: IconCandidate[] = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = attribute(tag, "rel")?.toLowerCase() ?? "";
    const href = attribute(tag, "href");
    if (!href || !/\bicon\b|apple-touch-icon/.test(rel)) continue;
    const size = Number(attribute(tag, "sizes")?.split("x")[0]) || 0;
    const isSvg = /\.svg(\?|$)/i.test(href) || attribute(tag, "type") === "image/svg+xml";
    const score = (rel.includes("apple-touch-icon") ? 10_000 : 0) + (isSvg ? 5_000 : size);
    try {
      candidates.push({ href: new URL(href, baseUrl).href, score });
    } catch {
      // Malformed href — skip it.
    }
  }
  candidates.push({ href: new URL("/favicon.ico", baseUrl).href, score: -1 });
  return candidates.sort((a, b) => b.score - a.score);
}

async function downloadImage(url: string) {
  if (!url.startsWith("https://")) return null;
  const response = await fetch(url, { headers: { "User-Agent": "PharmaCompareDiscovery/1.0" }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) return null;
  const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const extension = extensionByType[type];
  if (!extension) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_BYTES) return null;
  return { bytes, extension };
}

async function main() {
  const force = process.argv.includes("--force");
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const providers = await prisma.provider.findMany({
    where: { status: "PUBLISHED", ...(force ? {} : { logoUrl: null }) },
    select: { id: true, tradingName: true, websiteDomain: true },
    orderBy: { tradingName: "asc" },
  });
  console.log(`Fetching logos for ${providers.length} pharmacies…`);

  let saved = 0;
  for (const provider of providers) {
    try {
      const { finalUrl, html } = await collectPublicWebsite(`https://${provider.websiteDomain}`);
      let image: Awaited<ReturnType<typeof downloadImage>> = null;
      for (const candidate of iconCandidates(html, finalUrl)) {
        image = await downloadImage(candidate.href).catch(() => null);
        if (image) break;
      }
      if (!image) {
        console.log(`  - ${provider.tradingName}: no usable icon found`);
        continue;
      }
      const fileName = `${providerSlug(provider.websiteDomain)}.${image.extension}`;
      writeFileSync(join(OUTPUT_DIR, fileName), image.bytes);
      await prisma.provider.update({ where: { id: provider.id }, data: { logoUrl: `/pharmacy-logos/${fileName}` } });
      saved++;
      console.log(`  ✓ ${provider.tradingName}: ${fileName}`);
    } catch (error) {
      console.log(`  - ${provider.tradingName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log(`Saved ${saved} of ${providers.length} logos.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
