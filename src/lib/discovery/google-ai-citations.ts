const excludedHosts = /(^|\.)(google\.[a-z.]+|googleusercontent\.com|gstatic\.com|nhs\.uk|pharmacyregulation\.org|cqc\.org\.uk|facebook\.com|instagram\.com|yell\.com|yelp\.[a-z.]+|trustpilot\.com)$/i;

export function assertGoogleAiRequestLimit(body: string) {
  if (/reached\s+the\s+request\s+limit\s+for\s+AI\s+responses/i.test(body)) {
    throw new Error("Google AI Mode request limit reached. Discovery stopped; candidates already saved are retained. Wait until Google allows AI responses again, then rerun discovery. Saved candidates will be skipped automatically.");
  }
}

export function googleAiCitationUrls(links: string[]) {
  const urls = new Set<string>();
  for (const link of links) {
    try {
      let url = new URL(link);
      if (/(^|\.)google\.[a-z.]+$/i.test(url.hostname)) {
        const redirected = url.searchParams.get("q") ?? url.searchParams.get("url");
        if (redirected) url = new URL(redirected);
      }
      if (url.protocol === "https:" && !excludedHosts.test(url.hostname)) urls.add(url.href);
    } catch { /* Ignore invalid and non-web citations. */ }
  }
  return urls;
}

export function googleAiCitationOrigins(links: string[]) {
  return new Set([...googleAiCitationUrls(links)].map(link => new URL(link).origin));
}

export async function waitForGoogleAiCitationUrls(
  readLinks: () => Promise<string[]>,
  wait: () => Promise<void>,
) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const urls = googleAiCitationUrls(await readLinks());
    if (urls.size) return urls;
    await wait();
  }
  return googleAiCitationUrls(await readLinks());
}

// Apply the same filtering while waiting as when selecting a homepage. Directory
// links can appear before the useful citations in a streaming AI response.
export async function waitForGoogleAiCitationOrigins(
  readLinks: () => Promise<string[]>,
  wait: () => Promise<void>,
) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const origins = googleAiCitationOrigins(await readLinks());
    if (origins.size) return origins;
    await wait();
  }
  return googleAiCitationOrigins(await readLinks());
}
