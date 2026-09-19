import type { DiscoveryAdapter, NormalizedCandidate } from "@/types/discovery";

const ORD_ORGANISATIONS_URL = "https://directory.spineservices.nhs.uk/ORD/2-0-0/organisations";
// RO182 = Pharmacy role, per the ORD role-code reference cited in docs/pharmacy-discovery-research-review.md.
const PHARMACY_ROLE_CODE = "RO182";
const PAGE_LIMIT = 200;
// Confirmed live (2026-09-16): the API rejects LastChangeDate values older than this with a 406
// ("Supplied LastChangeDate exceeds the limit of 185 days past."). 180 leaves a small safety
// margin. A lastRunAt older than this just means "too long since the last run" — omit the filter
// and do a full bounded pull instead of sending a value the API will reject outright.
const MAX_LAST_CHANGE_LOOKBACK_DAYS = 180;

// The ORD API's list endpoint (Organisations array with Name/OrgId/Status/PostCode/LastChangeDate)
// is a stable, long-standing NHS contract, unlike the two stubbed sources. This still does a
// bounded pull each run rather than true incremental cursoring — ODS distinguishes record-change
// date from effective date and warns about delayed updates (research-review doc), which a single
// "changed since" filter doesn't fully account for. Documented v1 limitation, not a silent shortcut.
type OdsOrganisation = Record<string, unknown>;

type OdsListResponse = {
  Organisations?: OdsOrganisation[];
};

function readString(item: OdsOrganisation, key: string): string | undefined {
  const value = item[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function normalize(item: OdsOrganisation): NormalizedCandidate | null {
  const odsCode = readString(item, "OrgId");
  const name = readString(item, "Name");
  if (!odsCode || !name) {
    console.warn("[discovery:nhs-ods] skipping item missing OrgId/Name", item);
    return null;
  }

  return {
    sourceRecordId: odsCode,
    name,
    postcode: readString(item, "PostCode"),
    odsCode,
    rawPayload: item as NormalizedCandidate["rawPayload"],
  };
}

export const nhsOdsAdapter: DiscoveryAdapter = {
  type: "NHS_ODS",
  async run({ lastRunAt, recordRequest }) {
    const cutoff = new Date(Date.now() - MAX_LAST_CHANGE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const lastChangeDate = lastRunAt && lastRunAt > cutoff ? lastRunAt.toISOString().slice(0, 10) : undefined;

    const organisations: OdsOrganisation[] = [];
    let offset = 0;
    // The list response carries no total-count field (live-confirmed 2026-09-17) — a page shorter
    // than the requested Limit is the only reliable "no more pages" signal, same pattern the other
    // adapters use rather than trusting a reported total.
    for (;;) {
      const params = new URLSearchParams({ Roles: PHARMACY_ROLE_CODE, Limit: String(PAGE_LIMIT) });
      // Live-confirmed (2026-09-17): the API 406s on an explicit Offset=0 ("Suppied Offset must be
      // greater than 1") — the first page must omit Offset entirely rather than pass 0.
      if (offset > 0) params.set("Offset", String(offset));
      // ORD accepts a bare YYYY-MM-DD and applies >= itself; FHIR's "gt" prefix
      // produces a misleading 406 about the 185-day limit even for recent dates.
      if (lastChangeDate) params.set("LastChangeDate", lastChangeDate);

      const requestUrl = `${ORD_ORGANISATIONS_URL}?${params.toString()}`;
      if (offset === 0) recordRequest?.(`GET ${requestUrl}`);

      const response = await fetch(requestUrl, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`NHS ODS ORD API returned ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ""}`);
      }

      const body = (await response.json()) as OdsListResponse;
      const page = body.Organisations ?? [];
      organisations.push(...page);

      if (page.length < PAGE_LIMIT) break;
      offset += PAGE_LIMIT;
    }

    return organisations.map(normalize).filter((candidate): candidate is NormalizedCandidate => candidate !== null);
  },
};
