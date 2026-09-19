import type { DiscoveryAdapter, NormalizedCandidate } from "@/types/discovery";

const ADVANCED_SEARCH_URL = "https://api.company-information.service.gov.uk/advanced-search/companies";
const DISPENSING_CHEMIST_SIC_CODE = "47730";
// Confirmed via Companies House's own API reference (size: "1-5000 results"): the maximum page size,
// same choice CQC's adapter made for the same reason — fewer requests to page through a full scan.
const PAGE_SIZE = 5000;

// Advanced Search's query parameters (sic_codes, incorporated_from, company_status, size,
// start_index) and the response envelope's pagination fields (hits, items) are confirmed against
// Companies House's own reference docs. The per-item schema is not fully confirmed — the reference
// portal renders that section client-side and couldn't be read directly — so parsing below is
// defensive: it only requires company_number (the identifier the rest of the pipeline depends on)
// and tolerates a couple of plausible field names for the rest, logging a warning rather than
// silently fabricating a value. Verify the exact item shape against a real response (once a real
// API key is available) before relying on this beyond the pilot — see
// docs/pharmacy-discovery-research-review.md.
type AdvancedSearchItem = Record<string, unknown>;

type AdvancedSearchResponse = {
  items?: AdvancedSearchItem[];
  hits?: number;
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
  async run({ lastRunAt, credentials, recordRequest }) {
    // DB-stored (via the Discovery sources admin screen) wins when present; COMPANIES_HOUSE_API_KEY
    // stays as a local-dev fallback so an existing .env setup keeps working.
    const apiKey = credentials?.apiKey ?? process.env.COMPANIES_HOUSE_API_KEY;
    if (!apiKey) {
      throw new Error("No Companies House API key configured — set one on the Discovery sources admin screen (or COMPANIES_HOUSE_API_KEY for local dev).");
    }

    // No lastRunAt means this source has never completed a run before — do a full, unrestricted
    // scan of the active SIC-47730 population (no incorporated_from) to establish a real baseline,
    // since almost every existing pharmacy was incorporated long before discovery started running
    // and a "since last run" filter would otherwise never find them. Once a baseline exists, later
    // runs pass incorporated_from=lastRunAt to only pull newly incorporated pharmacies instead of
    // re-fetching the same population every time.
    const incorporatedFrom = lastRunAt ? lastRunAt.toISOString().slice(0, 10) : undefined;
    const authorization = `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;

    const candidates: NormalizedCandidate[] = [];
    let startIndex = 0;
    let totalHits: number | undefined;

    for (;;) {
      const params = new URLSearchParams({
        sic_codes: DISPENSING_CHEMIST_SIC_CODE,
        company_status: "active",
        size: String(PAGE_SIZE),
        start_index: String(startIndex),
      });
      if (incorporatedFrom) params.set("incorporated_from", incorporatedFrom);

      const requestUrl = `${ADVANCED_SEARCH_URL}?${params.toString()}`;
      // Recorded once, for the first page only — the paginated requests that follow are
      // implementation detail, not "the query" staff want to reproduce (same as the CQC adapter).
      if (startIndex === 0) recordRequest?.(`GET ${requestUrl}\nAuthorization: Basic base64({apiKey}:)`);

      const response = await fetch(requestUrl, {
        headers: { Authorization: authorization, Accept: "application/json" },
      });

      // Confirmed in Companies House's own reference docs: "404 Not Found — No companies found." is
      // a documented, legitimate zero-results response for this endpoint (unusual REST convention —
      // most APIs return 200 with an empty list), not an error. A narrow incorporated_from window
      // (since last run) will often genuinely match nothing, so treat 404 as "0 candidates found",
      // never as a failure.
      if (response.status === 404) {
        if (startIndex === 0) return [];
        break;
      }

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`Companies House Advanced Search returned ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ""}`);
      }

      const body = (await response.json()) as AdvancedSearchResponse;
      const items = body.items ?? [];
      if (totalHits === undefined) totalHits = typeof body.hits === "number" ? body.hits : items.length;
      candidates.push(...items.map(normalize).filter((candidate): candidate is NormalizedCandidate => candidate !== null));

      startIndex += items.length;
      // items.length === 0 guards against an infinite loop if a reported hits total turns out to
      // be wrong (a page short of it returning nothing) rather than trusting it unconditionally.
      if (items.length === 0 || startIndex >= totalHits) break;
    }

    return candidates;
  },
};
