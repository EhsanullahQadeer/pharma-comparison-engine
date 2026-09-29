import { Resolver } from "node:dns/promises";
import { request } from "node:https";

import { extractPageTitle, isPublicIpv4, normalizePublicUrl, robotsAllows } from "./public-web-policy";

// Falls back to a public resolver when the system-configured DNS server rejects the query
// (e.g. a VPN/antivirus DNS proxy registered in Windows network config but not actually running).
const FALLBACK_DNS_SERVERS = ["1.1.1.1", "8.8.8.8"];

async function resolveHostname(hostname: string) {
  try {
    return await new Resolver({ timeout: 2000, tries: 1 }).resolve4(hostname);
  } catch {
    const fallback = new Resolver({ timeout: 2000, tries: 1 });
    fallback.setServers(FALLBACK_DNS_SERVERS);
    return fallback.resolve4(hostname);
  }
}

async function readPage(url: URL, signal: AbortSignal) {
  signal.throwIfAborted();
  const addresses = await resolveHostname(url.hostname);
  if (!addresses.length || addresses.some(address => !isPublicIpv4(address))) throw new Error("Website resolves to a restricted network address.");
  signal.throwIfAborted();
  // Pin the validated address to the socket, retaining the hostname for TLS verification.
  return new Promise<{ status: number; location?: string; type: string; text: string; challenge: boolean }>((resolve, reject) => {
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
      // AWS WAF signals its browser check in a header (the body can be empty), not the page text.
      const wafAction = String(response.headers["x-amzn-waf-action"] ?? "");
      response.on("end", () => resolve({ status: response.statusCode ?? 0, location: response.headers.location, type: response.headers["content-type"] ?? "", text: Buffer.concat(chunks).toString("utf8"), challenge: /challenge|captcha/i.test(wafAction) }));
    });
    req.on("error", reject);
    req.end();
  });
}

// A robots.txt answered by a human-verification page (Cloudflare "Just a moment…", or an AWS WAF
// `x-amzn-waf-action: challenge` response) has rules
// that exist but can't be read by a plain request — distinct from rules that refuse. Worded as a
// human-verification stop (not "robots rules", which callers treat as a final refusal) so price
// collection can read the rules in a browser once a person clears the check.
export const ROBOTS_BEHIND_CHALLENGE = "Collection stopped: robots.txt is behind a human-verification challenge; its rules can only be read in a browser once the check is cleared.";
const challengeMarkers = /just a moment|performing security verification|cf-chl-|challenge-platform|captcha|verify you are human|checking your browser/i;

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
    if (robots.status !== 404 && robots.status !== 200 && (robots.challenge || challengeMarkers.test(robots.text))) throw new Error(ROBOTS_BEHIND_CHALLENGE);
    // Kept distinct: an unreadable robots.txt (e.g. a 403 for visitors outside the UK) can still be
    // read in a browser, while rules that refuse are final. Both say "robots rules" so callers that
    // never escalate on either keep matching.
    if (robots.status !== 404 && (robots.status !== 200 || !/text\/plain/i.test(robots.type))) {
      throw new Error(`Collection stopped: robots rules could not be confirmed (HTTP ${robots.status}). Review it manually.`);
    }
    if (robots.status !== 404 && !robotsAllows(robots.text, url.pathname)) {
      throw new Error("Collection stopped: robots rules do not permit this page. Review it manually.");
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
