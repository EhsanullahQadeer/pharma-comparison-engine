import { z } from "zod";

import type { DiscoveryAdapter, NormalizedCandidate } from "@/types/discovery";

// Verified against the authenticated CQC Syndication OpenAPI definition, 2026-09-16.
const BASE_URL = "https://api.service.cqc.org.uk/public/v1";
// Live-verified: 5,000 is accepted; 100 required 643 sequential list requests.
const PAGE_SIZE = 5000;
// Discovery heuristic, not a comprehensive register of online pharmacies.
const RELEVANT_NAME_PATTERN = /pharmacy|pharmacies|chemist|online doctor|dispensing/i;
// Live-verified against /providers?primaryInspectionCategoryName=... (2026-09-17): pharmacy
// businesses that also run an online-prescribing/private-clinic service are tagged with one of
// these CQC primary inspection categories even when their registered name doesn't contain
// "pharmacy"/"chemist" at all (e.g. name-only matching misses these). Deliberately excludes the
// much broader "Treatment of disease, disorder or injury" regulated activity (21,777 of 64,226
// providers — most hospitals/GP practices/dental clinics have it too, so it doesn't narrow
// anything). These four categories together cover ~3,700 providers, a small enough set to detail-
// fetch in full without the name filter, unlike the full 64,226-provider register.
const PHARMACY_ADJACENT_CATEGORIES = [
  "Independent consulting doctors",
  "Remote clinical advice",
  "Community health - NHS & Independent",
  "Slimming Clinics",
];
const requiredText = z.string().trim().min(1);
const optionalText = z.string().nullish().transform((value) => value?.trim() || undefined);
const providerListSchema = z.object({
  page: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  providers: z.array(z.object({ providerId: requiredText, providerName: requiredText })),
});
const providerSchema = z.object({
  providerId: requiredText,
  name: requiredText,
  postalCode: optionalText,
  website: optionalText,
  companiesHouseNumber: optionalText,
  odsCode: optionalText,
});

function websiteDomain(website: string | undefined): string | undefined {
  if (!website) return undefined;
  try {
    const url = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
    if (!url.hostname.includes(".") || url.username || url.password) return undefined;
    return url.hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

async function request(path: string, subscriptionKey: string): Promise<unknown> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Ocp-Apim-Subscription-Key": subscriptionKey, Accept: "application/json" },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    // Response bodies can echo credentials; persist only controlled errors in the run log.
    const hints: Record<number, string> = {
      401: "Check that the subscription key is valid and the CQC subscription is active.",
      403: "Check that the subscription grants access to the Syndication API.",
      429: "CQC's request limit was reached. Retry later.",
    };
    throw new Error(`CQC API returned ${response.status}. ${hints[response.status] ?? "Retry later or check the CQC service status."}`);
  }
  return response.json();
}

type ProviderSummary = { providerId: string; providerName: string };

// Shared pagination for both passes below — extraParams narrows the list server-side (e.g. by
// category); with none, it's the same unrestricted full-register scan as before.
async function fetchAllProviderSummaries(subscriptionKey: string, extraParams: [string, string][]): Promise<ProviderSummary[]> {
  const summaries: ProviderSummary[] = [];
  let page = 1;
  let totalPages = 1;
  // Also retries safely after failed runs; lastRunAt currently includes failures.
  do {
    const params = new URLSearchParams(extraParams);
    params.set("page", String(page));
    params.set("perPage", String(PAGE_SIZE));
    const result = providerListSchema.safeParse(await request(`/providers?${params}`, subscriptionKey));
    if (!result.success || result.data.page !== page) {
      throw new Error("CQC returned an unexpected providers page. No discovery results were saved.");
    }
    const body = result.data;
    if (body.totalPages > 0 && (body.totalPages < page || body.providers.length === 0)) {
      throw new Error("CQC returned inconsistent pagination. Retry the discovery run.");
    }
    totalPages = body.totalPages;
    summaries.push(...body.providers);
    page += 1;
  } while (page <= totalPages);
  return summaries;
}

export const cqcAdapter: DiscoveryAdapter = {
  type: "CQC",
  async run({ credentials, recordRequest }) {
    const subscriptionKey = (credentials?.subscriptionKey ?? process.env.CQC_SUBSCRIPTION_KEY)?.trim();
    if (!subscriptionKey) {
      throw new Error("No CQC subscription key configured — enter a primary or secondary key on the Discovery sources screen (or set CQC_SUBSCRIPTION_KEY for local development).");
    }
    const categoryParams: [string, string][] = PHARMACY_ADJACENT_CATEGORIES.map((name) => ["primaryInspectionCategoryName", name]);
    // Recorded once, for the first page of each pass — the paginated/per-provider detail calls that
    // follow are implementation detail, not "the query" staff want to reproduce.
    recordRequest?.(
      `GET ${BASE_URL}/providers?page=1&perPage=${PAGE_SIZE} (full scan, kept if name matches pharmacy/chemist/dispensing)\n` +
        `GET ${BASE_URL}/providers?${new URLSearchParams(categoryParams)}&page=1&perPage=${PAGE_SIZE} (category-filtered, all kept)\n` +
        `Ocp-Apim-Subscription-Key: {subscriptionKey}`,
    );

    const seen = new Set<string>();
    const toFetch: ProviderSummary[] = [];

    // Pass 1: full register, kept only when the provider's own name looks pharmacy-related.
    for (const summary of await fetchAllProviderSummaries(subscriptionKey, [])) {
      if (seen.has(summary.providerId) || !RELEVANT_NAME_PATTERN.test(summary.providerName)) continue;
      seen.add(summary.providerId);
      toFetch.push(summary);
    }

    // Pass 2: providers CQC itself categorizes as prescribing/private-clinic-adjacent — catches
    // real pharmacy businesses whose registered CQC name doesn't say "pharmacy" at all (e.g.
    // "Pharmacy2U Limited" already matches by name, but not every online-prescribing pharmacy does).
    // Kept unconditionally, without the name filter, since the category itself is the relevance
    // signal here — deliberately less precise than pass 1, but every candidate still goes through
    // staff review before publication.
    for (const summary of await fetchAllProviderSummaries(subscriptionKey, categoryParams)) {
      if (seen.has(summary.providerId)) continue;
      seen.add(summary.providerId);
      toFetch.push(summary);
    }

    const candidates: NormalizedCandidate[] = [];
    for (const summary of toFetch) {
      // List responses contain only providerId/providerName; websites require the detail endpoint.
      const result = providerSchema.safeParse(await request(`/providers/${encodeURIComponent(summary.providerId)}`, subscriptionKey));
      if (!result.success || result.data.providerId !== summary.providerId) {
        throw new Error("CQC returned unexpected provider details. No discovery results were saved.");
      }
      const provider = result.data;
      candidates.push({
        sourceRecordId: provider.providerId,
        name: provider.name,
        postcode: provider.postalCode,
        websiteDomain: websiteDomain(provider.website),
        companyNumber: provider.companiesHouseNumber,
        odsCode: provider.odsCode,
        // Provider IDs must never be used as CQC_LOCATION_ID matches.
        rawPayload: JSON.parse(JSON.stringify(provider)) as NormalizedCandidate["rawPayload"],
      });
    }
    return candidates;
  },
};
