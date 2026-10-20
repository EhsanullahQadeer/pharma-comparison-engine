import { normalizePublicUrl } from "@/lib/discovery/public-web-policy";

// Pure helpers for staff-submitted websites (the MANUAL_WEB discovery source): a staff member found
// a pharmacy site themselves (e.g. in an ordinary Google search) and drops its address in for the
// normal review queue. Nothing here decides anything — review stays with staff.

// What staff paste, as a public HTTPS address: a bare "example.co.uk" gets "https://" in front.
// Throws (with a message to show) for anything that isn't a public HTTPS website.
export function intakeUrl(input: string) {
  const trimmed = input.trim();
  return normalizePublicUrl(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
}

// "https://www.Example-Pharmacy.co.uk/ed?x=1" → "example-pharmacy.co.uk": the same form the rest of
// discovery and Provider.websiteDomain use, so duplicate checks are exact.
export function intakeDomain(input: string) {
  return intakeUrl(input).hostname.toLowerCase().replace(/^www\./, "");
}

// A GPhC premises number printed on the page ("GPhC registration number: 9012345"). Only a
// candidate for staff to check against the register, never treated as verified.
export function gphcNumberFromPage(html: string) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
  return /\bGPhC\b[^0-9]{0,40}?(\d{7})\b/i.exec(text)?.[1] ?? null;
}

const namedEntities: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", ndash: "–", mdash: "—" };

// Titles arrive as raw HTML text: "Doorstep Pharmacy &#8211; Harrow&#039;s …".
function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    if (code.startsWith("#")) return String.fromCodePoint(Number(code.slice(1)));
    return namedEntities[code.toLowerCase()] ?? entity;
  });
}

// The page title without the usual " | Buy online" style tail, else the domain.
export function intakeName(title: string | undefined, domain: string) {
  const cleaned = title && decodeEntities(title).split(/\s[|–—-]\s/)[0]?.trim();
  return cleaned && cleaned.length >= 2 ? cleaned.slice(0, 120) : domain;
}
