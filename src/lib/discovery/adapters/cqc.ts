import { z } from "zod";

import type { DiscoveryAdapter, NormalizedCandidate } from "@/types/discovery";

// Verified against the authenticated CQC Syndication OpenAPI definition, 2026-09-16.
const BASE_URL = "https://api.service.cqc.org.uk/public/v1";
const PAGE_SIZE = 100;
// Discovery heuristic, not a comprehensive register of online pharmacies.
const RELEVANT_NAME_PATTERN = /pharmacy|pharmacies|chemist|online doctor|dispensing/i;
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

export const cqcAdapter: DiscoveryAdapter = {
  type: "CQC",
  async run({ credentials }) {
    const subscriptionKey = (credentials?.subscriptionKey ?? process.env.CQC_SUBSCRIPTION_KEY)?.trim();
    if (!subscriptionKey) {
      throw new Error("No CQC subscription key configured — enter a primary or secondary key on the Discovery sources screen (or set CQC_SUBSCRIPTION_KEY for local development).");
    }
    const candidates: NormalizedCandidate[] = [];
    const seen = new Set<string>();
    let page = 1;
    let totalPages = 1;
    // Full scans also retry safely after failed runs; lastRunAt currently includes failures.
    do {
      const params = new URLSearchParams({ page: String(page), perPage: String(PAGE_SIZE) });
      const result = providerListSchema.safeParse(await request(`/providers?${params}`, subscriptionKey));
      if (!result.success || result.data.page !== page) {
        throw new Error("CQC returned an unexpected providers page. No discovery results were saved.");
      }
      const body = result.data;
      if (body.totalPages > 0 && (body.totalPages < page || body.providers.length === 0)) {
        throw new Error("CQC returned inconsistent pagination. Retry the discovery run.");
      }
      totalPages = body.totalPages;
      for (const summary of body.providers) {
        if (seen.has(summary.providerId) || !RELEVANT_NAME_PATTERN.test(summary.providerName)) continue;
        seen.add(summary.providerId);
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
      page += 1;
    } while (page <= totalPages);
    return candidates;
  },
};
