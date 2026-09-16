# CQC discovery configuration

Verified against the authenticated [CQC Syndication API reference](https://api-portal.service.cqc.org.uk/api-details#api=syndication) and its exported OpenAPI definition on 2026-09-16.

## Setup

In Admin → Discovery sources → CQC → Edit, enter either the primary or secondary subscription key, save, then use Run now. Only one key is needed. The portal login password is not an API key. No partner code is required.

Alternatively, set `CQC_SUBSCRIPTION_KEY` in the server environment and restart the application. A saved admin credential takes precedence. Admin credential storage requires the existing `DISCOVERY_CREDENTIALS_ENCRYPTION_KEY` configuration. Never use a `NEXT_PUBLIC_` environment variable for the key.

The base URL is `https://api.service.cqc.org.uk/public/v1`, with the key in the `Ocp-Apim-Subscription-Key` header. Earlier research mentioning `api.cqc.org.uk` or a required `partnerCode` is superseded by this authenticated reference.

## Discovery behavior and limits

- Reads every `/providers` page using `page` and `perPage`. List rows contain `providerId` and `providerName`.
- Keeps names matching pharmacy/pharmacies, chemist, online doctor or dispensing. This heuristic is not complete coverage of online providers and may include irrelevant candidates requiring staff review.
- Fetches `/providers/{id}` for matching candidates to obtain name, website, postcode, company number and ODS code. Stores the website hostname for the existing provider form.
- Retains the CQC provider ID as the source record ID and in the saved source data. It is not a CQC location ID and must not be used as a location-based duplicate match. Company/ODS identifiers can still suggest existing providers. Provider-ID cross-source matching is not implemented.
- Runs a full scan on each invocation. Large registers may take several minutes; deployment request timeouts must accommodate the work. Incremental changes and resumable background discovery are not implemented here.
- Invalid responses, failed detail requests and rate limits fail the run visibly rather than reporting an incomplete scan as successful. Staff can retry later. Results still require staff review before publication.

## Verification

Focused mocked-response tests cover multiple pages, deduplication within a scan, detail enrichment, identifier separation, malformed/repeated pages, empty results and safe authentication/rate-limit errors. The authenticated documentation was read with Playwright. A real subscription-key discovery run remains to be verified; documentation access alone does not verify API access.
