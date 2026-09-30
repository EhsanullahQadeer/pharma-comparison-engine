import { isIP } from "node:net";

export function normalizePublicUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.port || url.username || url.password || isIP(url.hostname) || !url.hostname.includes(".") || url.hostname.endsWith(".")) {
    throw new Error("Use a public HTTPS website address without credentials or a custom port.");
  }
  // The query stays: it often names the page itself (Well's xmlsitemap.php?type=products&page=1,
  // Oxford e-Pharmacy's product?product_id=…). Only the in-page fragment is dropped.
  url.hash = "";
  return url;
}

export function isPublicIpv4(address: string): boolean {
  if (isIP(address) !== 4) return false;
  const [a, b] = address.split(".").map(Number);
  if ([0, 10, 127].includes(a) || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && [0, 2, 168].includes(b) || a === 198 && [18, 19, 51].includes(b) || a === 203 && b === 0) return false;
  return true;
}

const ROBOTS_AGENT = "pharmacomparediscovery";

// RFC-style group selection, longest matching rule, Allow wins equal-length ties.
export function robotsAllows(text: string, path: string): boolean {
  const groups: { agents: string[]; rules: { allow: boolean; pattern: string }[] }[] = [];
  let group: (typeof groups)[number] | undefined;
  for (const line of text.split(/\r?\n/)) {
    const clean = line.split("#")[0].trim();
    const colon = clean.indexOf(":");
    if (colon < 0) continue;
    const key = clean.slice(0, colon).toLowerCase();
    const value = clean.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (!group || group.rules.length) { group = { agents: [], rules: [] }; groups.push(group); }
      group.agents.push(value.toLowerCase());
    } else if (group && (key === "allow" || key === "disallow") && value) {
      group.rules.push({ allow: key === "allow", pattern: value });
    }
  }
  // Our own product token, matched whole (RFC 9309) — not as a substring, or a group for some other
  // bot named e.g. "rma" (Dr Fox's robots.txt) would be read as addressed to "phaRMAcomparediscovery".
  const specific = groups.filter(g => g.agents.includes(ROBOTS_AGENT));
  const selected = specific.length ? specific : groups.filter(g => g.agents.includes("*"));
  let best = -1;
  let allowed = true;
  for (const rule of selected.flatMap(g => g.rules)) {
    const end = rule.pattern.endsWith("$");
    const pattern = end ? rule.pattern.slice(0, -1) : rule.pattern;
    const expression = pattern.split("*").map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
    if (!new RegExp(`^${expression}${end ? "$" : ""}`).test(path)) continue;
    const length = pattern.replaceAll("*", "").length;
    if (length > best || length === best && rule.allow) { best = length; allowed = rule.allow; }
  }
  return allowed;
}

export function extractPageTitle(html: string): string | undefined {
  const text = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return text?.replace(/<[^>]*>/g, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/\s+/g, " ").trim().slice(0, 180) || undefined;
}

// Signs that a response is a human-verification wall rather than the page asked for (Cloudflare's
// "Just a moment…"/cf-chl- interstitial and similar) — these always stop collection.
const verificationWallMarkers = /cf-chl-|just a moment\.\.\.|verify you are human|checking your browser|performing security verification/i;
// A bare CAPTCHA mention only means a wall on a page with almost no content of its own: plenty of
// real product pages carry a reCAPTCHA field on a newsletter or contact form (e.g. Pharmulous).
const captchaMention = /captcha/i;
const WALL_MAX_TEXT_LENGTH = 1500;

export function isHumanVerificationPage(html: string): boolean {
  if (verificationWallMarkers.test(html)) return true;
  if (!captchaMention.test(html)) return false;
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length < WALL_MAX_TEXT_LENGTH;
}
