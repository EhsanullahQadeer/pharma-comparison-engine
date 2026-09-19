import { Resolver } from "node:dns/promises";
import { request } from "node:https";

import { extractPageTitle, isPublicIpv4, normalizePublicUrl, robotsAllows } from "./public-web-policy";

async function readPage(url: URL, signal: AbortSignal) {
  const resolver = new Resolver({ timeout: 2000, tries: 1 });
  signal.throwIfAborted();
  const addresses = await resolver.resolve4(url.hostname);
  if (!addresses.length || addresses.some(address => !isPublicIpv4(address))) throw new Error("Website resolves to a restricted network address.");
  signal.throwIfAborted();
  // Pin the validated address to the socket, retaining the hostname for TLS verification.
  return new Promise<{ status: number; location?: string; type: string; text: string }>((resolve, reject) => {
    const req = request(url, {
      agent: false, family: 4, signal,
      lookup: (_hostname, _options, callback) => callback(null, addresses[0], 4),
      headers: { "User-Agent": "PharmaCompareDiscovery/1.0", Accept: "text/html,text/plain", "Accept-Encoding": "identity" },
    }, response => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => resolve({ status: response.statusCode ?? 0, location: response.headers.location, type: response.headers["content-type"] ?? "", text: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", reject);
    req.end();
  });
}

// Shared SSRF-safe, robots-respecting fetch behind both collectPublicWebsite (HTML pages) and
// collectPublicResource (e.g. a sitemap.xml for product detection) — same redirect/robots/status
// handling either way, only the accepted content type and CAPTCHA check differ.
async function collectPublicResource(input: string, accept: RegExp, { detectChallenge = true } = {}) {
  const signal = AbortSignal.timeout(12_000);
  let url = normalizePublicUrl(input);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const robots = await readPage(new URL("/robots.txt", url), signal);
    if ([301, 302, 303, 307, 308].includes(robots.status) && robots.location) {
      // robots.txt itself redirecting (e.g. the bare domain -> "www.") means the whole origin
      // does — resolve to that origin before judging robots rules or fetching the page, rather
      // than failing on a robots.txt response that was never actually served.
      url = normalizePublicUrl(new URL(url.pathname + url.search, new URL(robots.location, url).origin).href);
      continue;
    }
    if (robots.status !== 404 && (robots.status !== 200 || !/text\/plain/i.test(robots.type) || !robotsAllows(robots.text, url.pathname))) {
      throw new Error("Collection stopped: robots rules could not be confirmed or do not permit this page. Review it manually.");
    }
    const page = await readPage(url, signal);
    if ([301, 302, 303, 307, 308].includes(page.status) && page.location) {
      url = normalizePublicUrl(new URL(page.location, url).href);
      continue;
    }
    if (page.status !== 200) throw new Error(`Collection stopped (HTTP ${page.status}). Review the page manually.`);
    if (detectChallenge && /captcha|recaptcha|hcaptcha|cf-chl-|verify you are human|checking your browser/i.test(page.text)) {
      throw new Error("Page contains a human-verification challenge or CAPTCHA marker. Review it in your browser; automated collection stopped.");
    }
    if (!accept.test(page.type)) throw new Error(`Unexpected content type for this page: ${page.type || "unknown"}.`);
    return { finalUrl: url.href, text: page.text };
  }
  throw new Error("Too many redirects. Review this website manually.");
}

export async function collectPublicWebsite(input: string) {
  const { finalUrl, text } = await collectPublicResource(input, /text\/html/i);
  return { title: extractPageTitle(text), finalUrl, html: text };
}

// For non-HTML public resources on an already-approved domain (e.g. sitemap.xml) — same SSRF/
// robots handling as collectPublicWebsite, without the HTML-only/CAPTCHA checks that don't apply.
export async function collectPublicResourceText(input: string, accept: RegExp) {
  return collectPublicResource(input, accept, { detectChallenge: false });
}
