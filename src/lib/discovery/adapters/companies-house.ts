import type { DiscoveryAdapter, NormalizedCandidate } from "@/types/discovery";

const ADVANCED_SEARCH_URL = "https://api.company-information.service.gov.uk/advanced-search/companies";
const DISPENSING_CHEMIST_SIC_CODE = "47730";
const DEFAULT_LOOKBACK_DAYS = 30;
const PAGE_SIZE = 100;

// Advanced Search's query parameters (sic_codes, incorporated_from, company_status, size,
// start_index) are confirmed against Companies House's own reference docs. Its response body
// schema is not fully confirmed — the reference portal renders that section client-side and
// couldn't be read directly — so parsing below is defensive: it only requires company_number
// (the identifier the rest of the pipeline depends on) and tolerates a couple of plausible field
// names for the rest, logging a warning rather than silently fabricating a value. Verify the exact
// shape against a real response (once a real API key is available) before relying on this beyond
// the pilot — see docs/pharmacy-discovery-research-review.md.
type AdvancedSearchItem = Record<string, unknown>;

type AdvancedSearchResponse = {
  items?: AdvancedSearchItem[];
};

function readString(item: AdvancedSearchItem, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function readAddressPostcode(item: AdvancedSearchItem): string | undefined {
  const address = item.registered_office_address;
  if (!address || typeof address !== "object") return undefined;
  return readString(address as AdvancedSearchItem, "postal_code", "postcode");
}

function normalize(item: AdvancedSearchItem): NormalizedCandidate | null {
  const companyNumber = readString(item, "company_number");
  if (!companyNumber) {
    console.warn("[discovery:companies-house] skipping item with no company_number", item);
    return null;
  }

  return {
    sourceRecordId: companyNumber,
    name: readString(item, "company_name", "title") ?? companyNumber,
    postcode: readAddressPostcode(item),
    companyNumber,
    rawPayload: item as NormalizedCandidate["rawPayload"],
  };
}

export const companiesHouseAdapter: DiscoveryAdapter = {
  type: "COMPANIES_HOUSE",
  async run({ lastRunAt, credentials }) {
    // DB-stored (via the Discovery sources admin screen) wins when present; COMPANIES_HOUSE_API_KEY
    // stays as a local-dev fallback so an existing .env setup keeps working.
    const apiKey = credentials?.apiKey ?? process.env.COMPANIES_HOUSE_API_KEY;
    if (!apiKey) {
      throw new Error("No Companies House API key configured — set one on the Discovery sources admin screen (or COMPANIES_HOUSE_API_KEY for local dev).");
    }

    const since = lastRunAt ?? new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      sic_codes: DISPENSING_CHEMIST_SIC_CODE,
      company_status: "active",
      incorporated_from: since.toISOString().slice(0, 10),
      size: String(PAGE_SIZE),
      start_index: "0",
    });

    const authorization = `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
    const response = await fetch(`${ADVANCED_SEARCH_URL}?${params.toString()}`, {
      headers: { Authorization: authorization, Accept: "application/json" },
    });

    // Confirmed in Companies House's own reference docs: "404 Not Found — No companies found." is
    // a documented, legitimate zero-results response for this endpoint (unusual REST convention —
    // most APIs return 200 with an empty list), not an error. A narrow incorporated_from window
    // (since last run) will often genuinely match nothing, so treat 404 as "0 candidates found",
    // never as a failure.
    if (response.status === 404) return [];

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Companies House Advanced Search returned ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ""}`);
    }

    const body = (await response.json()) as AdvancedSearchResponse;
    return (body.items ?? []).map(normalize).filter((candidate): candidate is NormalizedCandidate => candidate !== null);
  },
};
