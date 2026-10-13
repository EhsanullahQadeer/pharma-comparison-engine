// The only places an article may cite: the health service, medicines and professional regulators,
// international health bodies, official product information and peer-reviewed research. A source on
// any other website is refused when an article is saved or published. Subdomains are included
// (cks.nice.org.uk, yellowcard.mhra.gov.uk).
const TRUSTED_SOURCE_DOMAINS = [
  "nhs.uk", "nhsinform.scot", "nhs.wales", "nice.org.uk", "gov.uk",
  "who.int", "ema.europa.eu",
  "medicines.org.uk",
  "pharmacyregulation.org", "psni.org.uk", "gmc-uk.org", "cqc.org.uk", "rpharms.com",
  "bhf.org.uk", "baus.org.uk", "travelhealthpro.org.uk",
  "doi.org", "nih.gov", "cochranelibrary.com",
];

export const TRUSTED_SOURCES_HINT = "Accepted: NHS, NICE, GOV.UK and the MHRA, WHO, EMA, emc product information (medicines.org.uk), UK health regulators and professional bodies, and peer-reviewed papers (doi.org, PubMed, Cochrane).";

// Sources are stored one per line as "Title — https://…" (or a bare URL).
export function parseSource(source: string) {
  const match = source.match(/^(.*?)\s*[—–-]\s*(https?:\/\/\S+)$/);
  if (match) return { label: match[1], url: match[2] };
  return source.startsWith("http") ? { label: source, url: source } : { label: source, url: null };
}

function isTrustedSource(source: string) {
  const { url } = parseSource(source);
  if (!url || !URL.canParse(url)) return false;
  const host = new URL(url).hostname.toLowerCase();
  return TRUSTED_SOURCE_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function untrustedSources(sources: string[]) {
  return sources.filter((source) => !isTrustedSource(source));
}
