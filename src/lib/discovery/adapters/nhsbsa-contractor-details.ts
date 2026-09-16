import type { DiscoveryAdapter, NormalizedCandidate } from "@/types/discovery";

const PACKAGE_SHOW_URL = "https://opendata.nhsbsa.net/api/3/action/package_show?id=contractor-details";
const DATASTORE_SEARCH_URL = "https://opendata.nhsbsa.net/api/3/action/datastore_search";
const PAGE_LIMIT = 200;

// Confirmed live (2026-09-16) against the real NHSBSA Open Data Portal CKAN API — this dataset is
// "Contractor Details" (opendata.nhsbsa.net/dataset/contractor-details), published monthly, a
// separate dataset from the Consolidated Pharmaceutical List the raw research assumed. Field names
// below were read directly from a real datastore_search response, not guessed: CONTRACTOR_CODE,
// CONTRACTOR_NAME, TRADING_NAME, POST_CODE, and — the field the earlier research review couldn't
// confirm (its attempt timed out) — DISTANCE_SELLING_CONTRACTOR, a "Y"/"N" string. The server-side
// filters param was verified to genuinely restrict results (not just cosmetic — the API's own
// `total` count is a known unfiltered-dataset-size quirk, but the returned `records` are correctly
// filtered), confirmed by checking 10 real returned rows all had "Y" and were genuine, distinct
// pharmacy names.
type CkanResource = { id: string; format: string; created: string };

type PackageShowResponse = {
  result?: { resources?: CkanResource[] };
};

type ContractorRecord = Record<string, unknown>;

type DatastoreSearchResponse = {
  result?: { records?: ContractorRecord[] };
};

function readString(record: ContractorRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

// The dataset publishes one new CSV resource per month (e.g. CONTRACTOR_DETAILS_202608) — always
// resolve the most recent one rather than hardcoding a resource id that goes stale next month.
async function findLatestResourceId(): Promise<string> {
  const response = await fetch(PACKAGE_SHOW_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`NHSBSA Contractor Details package_show returned ${response.status} ${response.statusText}`);
  }

  const body = (await response.json()) as PackageShowResponse;
  const csvResources = (body.result?.resources ?? []).filter((resource) => resource.format === "CSV");
  if (csvResources.length === 0) {
    throw new Error("NHSBSA Contractor Details: no CSV resources found in the dataset.");
  }

  const latest = [...csvResources].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())[0];
  return latest.id;
}

// CONTRACTOR_CODE is the same F-code format NHS ODS uses as OrgId (e.g. "FA371") — a real,
// confirmed crosswalk to ProviderIdentifierType.ODS_CODE, not an assumption.
function normalize(record: ContractorRecord): NormalizedCandidate | null {
  const contractorCode = readString(record, "CONTRACTOR_CODE");
  const name = readString(record, "TRADING_NAME") ?? readString(record, "CONTRACTOR_NAME");
  if (!contractorCode || !name) {
    console.warn("[discovery:nhsbsa-contractor-details] skipping record missing CONTRACTOR_CODE/name", record);
    return null;
  }

  return {
    sourceRecordId: contractorCode,
    name,
    postcode: readString(record, "POST_CODE"),
    odsCode: contractorCode,
    rawPayload: record as NormalizedCandidate["rawPayload"],
  };
}

export const nhsbsaContractorDetailsAdapter: DiscoveryAdapter = {
  type: "NHSBSA_CONTRACTOR_DETAILS",
  async run() {
    const resourceId = await findLatestResourceId();

    const params = new URLSearchParams({
      resource_id: resourceId,
      limit: String(PAGE_LIMIT),
      filters: JSON.stringify({ DISTANCE_SELLING_CONTRACTOR: "Y" }),
    });

    const response = await fetch(`${DATASTORE_SEARCH_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`NHSBSA Contractor Details datastore_search returned ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ""}`);
    }

    const body = (await response.json()) as DatastoreSearchResponse;
    const records = body.result?.records ?? [];

    // Defensive re-check, not just trust in the API filter — belt-and-suspenders given the
    // `total`-field quirk noted above.
    return records
      .filter((record) => readString(record, "DISTANCE_SELLING_CONTRACTOR") === "Y")
      .map(normalize)
      .filter((candidate): candidate is NormalizedCandidate => candidate !== null);
  },
};
