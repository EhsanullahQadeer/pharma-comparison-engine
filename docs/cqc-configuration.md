# CQC discovery configuration

Verified against the authenticated [CQC Syndication API reference](https://api-portal.service.cqc.org.uk/api-details#api=syndication) and its exported OpenAPI definition on 2026-09-16.

## Setup

In Admin → Discovery sources → CQC → Edit, enter either the primary or secondary subscription key, save, then use Run now. Only one key is needed. The portal login password is not an API key. No partner code is required.

Alternatively, set `CQC_SUBSCRIPTION_KEY` in the server environment and restart the application. A saved admin credential takes precedence. Admin credential storage requires the existing `DISCOVERY_CREDENTIALS_ENCRYPTION_KEY` configuration. Never use a `NEXT_PUBLIC_` environment variable for the key.

The base URL is `https://api.service.cqc.org.uk/public/v1`, with the key in the `Ocp-Apim-Subscription-Key` header. Earlier research mentioning `api.cqc.org.uk` or a required `partnerCode` is superseded by this authenticated reference.

## Discovery behavior and limits

Two passes, unioned by provider ID, run on every invocation:

1. **Full scan** — reads every `/providers` page using `page` and `perPage=5000` (live-verified, no
   filters). List rows contain only `providerId`/`providerName`. Kept only when the name matches
   pharmacy/pharmacies/chemist/online doctor/dispensing. This heuristic misses real pharmacy
   businesses whose registered CQC legal-entity name doesn't contain one of those words (e.g. a
   pharmacy trading only under a brand name).
2. **Category-filtered pass** — queries `/providers?primaryInspectionCategoryName=...` (repeated
   for each of "Independent consulting doctors", "Remote clinical advice", "Community health - NHS
   & Independent", "Slimming Clinics" — an OR filter per CQC's own documented query semantics) and
   keeps every result unconditionally, without the name filter. Live-verified 2026-09-17: these four
   categories cover ~3,700 of the 64,226 providers and catch real online-prescribing pharmacies pass
   1 misses by name (e.g. one already-found candidate had an empty `inspectionCategories` and
   `type: "Social Care Org"`, while others had `type: "Independent Healthcare Org"` with one of
   these categories — the two passes are not a subset of each other). Deliberately excludes the much
   broader `regulatedActivity=Treatment of disease, disorder or injury` (21,777 of 64,226 — most
   hospitals/GP practices/dental clinics have it too, so it doesn't narrow anything on its own).
   Lower precision than pass 1 (a plain private GP clinic with no pharmacy component can share these
   categories) — acceptable since every candidate still goes through staff review before
   publication, same as pass 1.

- Fetches `/providers/{id}` for every candidate surfaced by either pass to obtain name, website,
  postcode, company number and ODS code. Stores the website hostname for the existing provider form.
- Retains the CQC provider ID as the source record ID and in the saved source data. It is not a CQC
  location ID and must not be used as a location-based duplicate match. Company/ODS identifiers can
  still suggest existing providers. Provider-ID cross-source matching is not implemented.
- Runs both passes' full scans on each invocation. The category pass adds real time: it can add
  thousands of extra detail requests on top of the full scan's usual dozen, so a run now
  legitimately takes several minutes rather than ~23 seconds — deployment request timeouts must
  accommodate this. Incremental changes and resumable background discovery are not implemented
  here.
- `registrationStatus` is fetched by the API but not currently stored or filtered on — some
  candidates surfaced by either pass may already be `"Deregistered"` with CQC (live-checked
  2026-09-17: 7 of the then-current 12 candidates were). Not yet surfaced to staff; a known gap, not
  a bug in the passes above.
- Invalid responses, failed detail requests and rate limits fail the run visibly rather than
  reporting an incomplete scan as successful. Staff can retry later. Results still require staff
  review before publication.

## Verification

On 2026-09-17, a subsequent full `runSource` test completed with `SUCCESS` in 23.3 seconds and saved 12 candidates, verified by querying their run association. These records were retained for staff review. The older Running badge came from an unfinished run dated 2026-09-16; refreshing the sources page now loads the newer successful run. This test exercised the shared orchestration, not the browser button.

Focused mocked-response tests cover multiple pages, deduplication within a scan, detail enrichment, identifier separation, malformed/repeated pages, empty results and safe authentication/rate-limit errors. The authenticated documentation was read with Playwright.

On 2026-09-17, a live read-only adapter run using the saved key scanned 64,226 providers and returned 12 candidates in 22.5 seconds (13 list requests plus 12 detail requests). At the former page size of 100 this required 643 list requests. The reported zero belonged to an unfinished run with null status/finish time; an interrupted process or timeout is plausible but not proven by that record alone. Earlier runs had failed with old authentication/hostname errors. No candidate records were written by the diagnostic run. Scheduled CQC discovery was disabled; manual Run now remains available.
