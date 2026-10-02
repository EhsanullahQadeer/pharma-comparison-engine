# Distance-selling pharmacy research workflow

This workflow reads the 790 candidates already exported from the June 2026 GPhC premises list. It uses the locally signed-in Patchright Chrome profile to ask Google AI for compact research, including official evidence URLs for product and commerce filters, asks ChatGPT to check that research, and makes at most one targeted Google follow-up if ChatGPT cannot decide. The follow-up review sees both the initial and follow-up Google answers. When Google evidence is insufficient, the ChatGPT prompt permits ChatGPT to use its own available web search/research. Any new URL ChatGPT finds is sent back to Google for corroboration before acceptance. This is not the separate, quota-limited ChatGPT Deep Research tool; normal ChatGPT may not invoke web search on every request. It does not change the database or automatically pass a CAPTCHA.

Close any Chrome window using the Patchright profile before starting. In PowerShell, from the project directory, run:

```powershell
npm.cmd run discovery:chatgpt-sign-in
```

Sign in within the browser this command opens. Wait for it to print `ChatGPT signed in to workflow profile: YES` and close the browser itself. Signing in to a different Chrome window or profile does not sign in the workflow profile. Each batch checks this sign-in before asking Google anything and stops without spending a Google request if it cannot verify the session. Then run:

```powershell
npm.cmd run discovery:distance-selling-workflow -- --limit 10
```

The default batch size is 10; use `--limit 1` for a single candidate or `--all` to keep going until the list finishes or a service stops the run. To preview the next batch without opening a browser:

```powershell
npm.cmd run discovery:distance-selling-workflow -- --limit 10 --dry-run
```

To run one specific candidate:

```powershell
npm.cmd run discovery:distance-selling-workflow -- --gphc 1124326 --limit 1
```

Rerun the same command to resume. Each completed Google and ChatGPT result is appended immediately. Existing completed searches/reviews are reused, and finalized GPhC numbers are skipped. The browser is closed between the Google and ChatGPT steps, so one profile is sufficient. Google or ChatGPT request limits, sign-in problems, and incomplete responses stop the batch without dropping prior results. Complete any manual sign-in/verification in the browser if requested; there is no automatic challenge solving or limit bypass. A signed-out ChatGPT profile cannot use your account's research features until you sign in again.

Files under `tmp/`:

- `distance-selling-google-ai-raw-results.jsonl`: source Google responses; new records are compact JSON, while older records remain in their original larger format.
- `distance-selling-chatgpt-refined-results.jsonl`: append-only review and error history.
- `distance-selling-known.jsonl`: latest AI-reviewed accepted pharmacies with a cited direct official product/treatment URL.
- `distance-selling-not-known.jsonl`: latest rejected or unresolved cases. Check each row's `decision.status`; `NEEDS_REVIEW` does not mean the pharmacy definitely lacks a listing.
- `distance-selling-classified.jsonl`: one row for every GPhC candidate, including those not yet researched. Filter `categories.distanceSellingEvidence`, `categories.publicListing`, `categories.erectileDysfunction`, `categories.listingBreadth`, `categories.treatmentAreas`, or `categories.needsManualReview` independently.
- `distance-selling-category-summary.json`: counts for those labels across all candidates, with a separate reviewed count. The classified file and summary are rebuilt with the known/not-known files after each candidate.

New ChatGPT reviews return a version-2 `decision.classification` object. It contains public-listing, ED-listing, treatment-area and listing-breadth labels, plus these further filters: purchase journey (direct checkout, consultation first, prescription request only, or unknown), fulfilment methods (home delivery, click and collect, local courier), delivery coverage (UK-wide, regional, local, or unknown), medicine supply (NHS prescription, private prescription, OTC), order channels (website, app, phone), and public price visibility. `evidenceUrlsByLabel` ties every positive label to an official-site URL; missing evidence leaves a filter unknown, not false. The reviewer checks that cited URLs are on the official website and are present in the Google evidence; a newly found URL still requires the existing Google follow-up before it can support an accepted result. A missing direct listing URL remains `NO_DIRECT_URL`, not proof of no products. The classified export copies these structured labels and identifies their origin as `CHATGPT_STRUCTURED`. Older saved reviews without this object remain usable, but their categories are marked `LEGACY_INFERRED`; unresearched candidates are marked `UNRESEARCHED`. The summary counts each classification source separately. No old browser reviews are silently rewritten. These records are not written into the live database; a separate verified import would be required.

If ChatGPT's direct-listing label contradicts its decision or lacks a direct official listing URL, the reviewer retains the case as `NEEDS_REVIEW` with unconfirmed listing labels rather than accepting it or stopping the whole batch. Follow-up queries prioritize the exact product/listing URL over a homepage. A homepage is only a product listing when that page itself visibly names products or treatments. A Google AI assertion or a homepage URL alone is not an independently verified listing.

For a `NEEDS_REVIEW` result, the decision retains ChatGPT's proposed labels for audit, but the main classified row withholds positive labels and marks `classificationSource` as `CHATGPT_UNRESOLVED`. Those cases are manual-review leads, not filterable confirmed products or services. Treatment-area and listing-breadth filters require a corroborated direct product/treatment listing; a general service mention does not populate them.

The two decision files are rebuilt after each candidate, so they remain usable after an interrupted batch. They are research leads, not independently verified regulator/website facts. Before importing an accepted pharmacy or its phone/delivery details into production data, open its official listing and identity pages and verify the GPhC number, listing, and details directly. Never treat an AI answer alone as proof.

The categories deliberately separate evidence from absence. `GPHC_INTERNET_PREMISES` and `GPHC_INTERNET_LOGO` come from the register export; neither proves that a public shop is currently operating. `DIRECT_URL_REPORTED` means the AI review supplied a direct URL, not that staff independently verified it. `SHOP_CLAIM_NO_DIRECT_URL` flags an advertised shop that still needs a direct listing URL; `NO_DIRECT_URL` is not proof that no products exist. `NOT_CONFIRMED` for erectile dysfunction likewise does not mean the pharmacy does not offer it. `MULTIPLE_TREATMENT_EXAMPLES` counts distinct examples in the review text, not the pharmacy's full inventory or number of products. Unreviewed candidates remain `UNRESEARCHED` and should not be counted as negative results.

## Second-stage product and price audit

Run this only after the first distance-selling browser batch has stopped and closed its Patchright Chrome window; both workflows use the same signed profile. The audit reads only the latest `distance-selling-known.jsonl` rows. It asks Google AI for named products and exact public GBP prices, asks ChatGPT to review that evidence, and then checks the cited official pages directly using the project's robots-respecting public-page collector. AI-only prices are never copied into the verified output. The cited page must expose a named Product with a GBP Offer in JSON-LD for an exact copied price. A service, consultation, or prescription-request page does not count as a priced product. The audit does not write to the database or change the original known/not-known files.

Preview the next known pharmacies without opening a browser:

```powershell
npm.cmd run discovery:audit-known-products -- --limit 5 --dry-run
```

Then run one live pharmacy first, followed by a small batch once its output looks right:

```powershell
npm.cmd run discovery:audit-known-products -- --limit 1
npm.cmd run discovery:audit-known-products -- --limit 10
```

Use `--gphc 1124326 --limit 1` to choose one accepted pharmacy. Completed audits are skipped on rerun; `--retry-unresolved` retries the latest unresolved rows. Google or ChatGPT limits stop the run rather than bypassing them. A failed or inaccessible official page stays unresolved.

If Google returns a stable prose answer instead of the requested JSON, the audit records that text as `NON_JSON` and checks the already-cited official page directly. It can confirm a priced product only from that page's Product/GBP-offer evidence; otherwise the pharmacy remains unresolved. Google's prose assertion that no products exist is never treated as a site-wide negative result.

The second-stage files are kept together in `tmp/distance-selling-product-price-audit/`:

- `audit.jsonl`: append-only audit history and resume ledger.
- `google.jsonl`: compact Google AI research used for this audit.
- `priced-products.jsonl`: named products and exact GBP offer prices verified on cited official pages. Each product has its source URL and separate ED flag.
- `products-no-price.jsonl`: named products found on the cited page, but no exact GBP offer price verified.
- `no-product-on-cited-page.jsonl`: cited service/appointment pages without a verifiable product listing. This **does not** mean the whole pharmacy website has no products.
- `needs-review.jsonl`: blocked, ambiguous, cross-domain-unverified, or inconsistent cases. Do not treat these as negative results.

The `listedErectileDysfunctionProducts` and `pricedErectileDysfunctionProducts` counts are separate, so a pharmacy is not labelled as having a priced ED product merely because its site mentions ED or lists another priced product. Prices can change and may exclude consultation, delivery, or dispensing charges; check the live page before publishing or importing them.
