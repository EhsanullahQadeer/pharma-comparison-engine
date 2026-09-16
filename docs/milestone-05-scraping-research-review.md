# Milestone 5: scraping and price-engine research review

Research date: 2026-09-16. Scope: review of `milestones/05-price-comparison-engine.md`, platform strategy, roadmap and current schema/actions. Recommendations below are proposals, not implemented or approved roadmap changes.

**User clarification, later 2026-09-16:** hosting is a VPS and launch has no referral partners. Milestone 5 now selects a separate Node.js worker with node-cron and durable Postgres jobs. Permitted page extraction plus staff verification are the launch sources; direct/affiliate feeds are optional future integrations. The Vercel discussion below is historical evaluation, not the selected deployment. Budget assumes zero referral revenue; collection/reuse permission and publication rules remain independent of partnership status.

## Assessment

Keep the overall feed-first, provider-adapter, staging-and-validation design. Strengthen the evidence and product models before building more adapters. Collecting a number is straightforward; proving that it is the current price of the exact pack under the stated purchase conditions is the core engineering problem.

Strong existing choices: background collection, integer-pence amounts, exact-product comparisons, conditional discounts, query-time freshness, exception review, deterministic sorting and history. These are worth preserving.

The milestone understates source reconciliation, browser operation, freshness semantics, multi-brand duplication and the gap between the intended rules and the current schema.

## Concrete findings in the repository

| Finding | Consequence | Proposed improvement |
| --- | --- | --- |
| `ProductVariant.strengthMg` is `Int`; action validation also requires integers >= 1 | Fractional strengths cannot be represented | Decimal strength with explicit unit/basis, or integer micrograms with consistent conversion |
| `packQuantity` has no explicit unit; milestone formula divides by tablet count | Pen, tablet, dose and bundle quantities can be confused | Pack unit, units per pack, labelled doses per unit, strength per dose versus concentration |
| Offer fee columns default to zero; offer form parsing substitutes zero for missing fees | Missing evidence can become apparent free delivery/consultation | Explicit UNKNOWN/INCLUDED/AMOUNT/NOT_APPLICABLE states with validation; unknown total remains null |
| Discount eligibility is free text | A calculation cannot reliably determine applicability | Structured customer cohort, product scope, minimum spend, validity, code, cap, discount basis and stacking rules, retaining original terms |
| History selects the newest unexpired discount, while its delivered total is the undiscounted sum | Historical totals and discount snapshots have ambiguous meaning | Label base total separately; preserve applicable promotion set and calculation version for each defined scenario |
| Milestone says one active collection method per provider | Price, shipping and promotion evidence cannot be reconciled cleanly | Multiple sources; exactly one deterministic authority for each field/context, with conflicts reviewed |
| Cron recommendation relies mainly on 2,000 requests/day | It overlooks execution time, browser resources, retry bursts and overlapping work | Benchmark representative sources and use durable per-source jobs |

These findings describe the working tree when inspected. Other discovery-related work is present, so this report does not claim M3b is still wholly unimplemented or edit those changes.

## Evidence from actual sources

- Click Pharmacy's retrieved Mounjaro page contains a headline starting price and a separate table of six strengths. That is direct evidence that one page may yield several exact offers and that a headline price is insufficient. Its delivery page separates NHS delivery from private-prescription delivery. Do not assume a general delivery option applies to every medicine. These were public-page observations, not checkout verification. [Product page](https://www.clickpharmacy.co.uk/weight-loss/mounjaro), [delivery](https://www.clickpharmacy.co.uk/delivery).
- Pharmica returned a JavaScript/robot-verification page to this research browser. This establishes an access obstacle for this request; it does not prove all access is blocked or that Playwright would be permitted or successful. [Observed URL](https://www.pharmica.co.uk/weight-loss/mounjaro/).
- The Independent Pharmacy request could not be opened by the research tool. Its extraction feasibility remains unassessed; a tool error is not evidence of a provider's policy.
- MHRA identifies the UK Mounjaro KwikPen as four doses and lists fractional dose strengths. Catalogue validation should use authoritative product information, not infer medical units from pharmacy marketing text. [MHRA](https://www.gov.uk/government/news/four-dose-mounjaro-kwikpen-approved-by-mhra-for-diabetes-and-weight-management).
- Awin exposes feed-update metadata. Checking it before downloading saves unnecessary retrievals, but a recent download of an old feed is not a newly verified price. [Awin publisher guide](https://help.awin.com/developers/docs/product-feed-publisher-guide-intro).

No provider agreement, authenticated feed, checkout, browser-based adapter or sustained crawl was tested. This is desk research plus public-page inspection, not a production feasibility benchmark.

## Recommended extraction approach

| Method | Advantages | Disadvantages | Role |
| --- | --- | --- | --- |
| Agreed direct API/CSV/XML feed | Stable IDs, broad catalogue per fetch, clear relationship | Onboarding effort; fees and restrictions may still be absent | Preferred where available; CSV is sufficient for a pilot |
| Approved affiliate feed | Structured products and links; update metadata | Restricted coverage/usage; upstream lag | Use only for eligible products and licensed use |
| HTTP retrieval plus JSON-LD/embedded data/HTML parsing | Low resource cost; easy saved-page regression tests | Variant state and dynamic prices may be missing | Default permitted page adapter |
| Browser extraction with Playwright | Can render selectors and observe the page's network responses | More compute, more requests, timeouts, browser maintenance | Fallback for permitted dynamic sources |
| Managed scraping execution | Reduces worker operation burden | Usage cost and vendor dependency; does not prove accuracy or grant rights | Evaluate if browser operations consume staff time |
| LLM-assisted extraction | Useful for investigating unfamiliar layouts and proposing mappings | Variable outputs, inference errors and evidence ambiguity | Review assistance; never sole authority for publishing money or dosage |
| Manual verification/import | Fast onboarding for a few providers; handles ambiguous terms | Recurrent labour and coverage limits | Deliberate fallback, with expiry |

Crawlee supports HTTP parsers and browser crawlers; Playwright exposes network inspection. For this TypeScript project, a small HTTP/Cheerio adapter layer with selective Playwright is a reasonable starting choice. Add Crawlee where its queue/concurrency lifecycle reduces actual work. No universal extractor or browser-only requirement is justified by the evidence. [Crawlee](https://crawlee.dev/js/docs/introduction), [Playwright](https://playwright.dev/docs/network).

Treat structured markup as evidence to validate, not an automatic truth source. `AggregateOffer.lowPrice` represents the minimum across offers, not necessarily the selected pack. Match provider SKU, brand, ingredient, exact strength, formulation, quantity and purchasing conditions before accepting a price. [Schema.org](https://schema.org/AggregateOffer).

Suggested discovery within an approved domain: supplied catalogue URLs/feed first, then sitemap/category links, then exact product URLs. Keep a canonical URL/SKU map and bounded crawl scope. Never crawl arbitrary site navigation on every scheduled check. One product page may supply many variants; deduplicate at URL and source level.

## Scheduling and operational design

Recommended flow:

`scheduler -> durable jobs -> source adapter -> observation/evidence -> normalization -> validation -> publish or review -> brand-specific comparison`

Use cron to discover due work, not as the only record of work. For a small HTTP pilot, the existing Postgres database can hold job state, atomic claims, expiring leases, retries and completion records. This avoids an immediate Redis dependency but still requires careful queue implementation. For browser-heavy work, use a separate worker or managed workflow service; BullMQ is an option if operating Redis is acceptable.

Vercel documents function duration limits, no automatic retry for failed cron invocations, possible overlap, and missed/duplicate delivery. Its Hobby schedule cannot support the milestone's four-hour feed cadence. These facts invalidate “cron alone is enough because volume is small”; they do not rule out Vercel as the scheduler. [Cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [plan limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Persist an idempotency key for each scheduled source/context check; publishing and history must be atomic. Reject an older run arriving after a newer accepted observation. A worker crash should release work through lease expiry, not leave permanent locks. Dead-letter exhausted jobs for staff review.

Retry transient network/5xx failures with bounded backoff and jitter. Respect server retry instructions on rate limiting; coordinate a cooldown across all jobs for that domain. Treat authentication failure, robot challenge, parse failure and invalid product mapping as different outcomes. Repeatedly downloading an unchanged broken page is not a useful retry strategy. BullMQ supports backoff and jitter but source-specific classification remains application work. [BullMQ retries](https://docs.bullmq.io/guide/retrying-failing-jobs).

Start conservatively with one in-flight request per domain and tune against permission, measured responses and published limits. Cap execution time, response size, redirects and total URLs. Browser assets create additional requests, so count actual network work, not only product-page navigations.

## Freshness and evidence

Keep separate timestamps for attempted retrieval, successful extraction, upstream feed update, accepted verification and publication. A successful HTTP status can still contain a challenge page, default selection, stale feed or missing prices.

Track price, shipping, mandatory fees, stock and discount evidence separately. Fresh item pricing does not refresh an old delivery policy automatically. Eligibility for total-price ranking should require all mandatory components, product mapping and purchase conditions to meet policy.

Retain the current 24h/48h user-facing policy as a pilot assumption, then validate it against observed changes. A 24-hour polling interval leaves no recovery margin before a 24-hour eligibility deadline; schedule earlier where permitted. Explicit discount expiry must apply immediately, even if the next crawl is tomorrow.

Unchanged-but-valid observations refresh the relevant check time without adding a duplicate price-change history row. Retain their run/evidence records outside generic staff audit logs. Preserve source URL, request context, timestamps, content hash, adapter version and small supporting extracts; save rendered evidence where necessary. Retention and access must follow source rights and avoid patient/account data.

If extraction fails, keep the last accepted observation with its original age. Do not turn missing rows into zero prices or out-of-stock results. If a source explicitly confirms out of stock, remove the offer from available-price ranking immediately.

## Validation improvements

Keep the >20% movement review guard, but do not make it the only one. A wrong pack can produce a plausible 10% change; a real market-wide increase can exceed 20%.

Validate currency, nonnegative money, discount bounds, exact product identity, customer cohort, source completeness, expected variant coverage and evidence consistency. Compare feed/page disagreements explicitly rather than selecting whichever value is cheaper. A parser change needs replay against stored fixtures before publication.

Important test cases: strength selector changes without price changes; headline minimum mistaken for every variant; first-order promotion applied to returning buyers; expired code; unknown fee; one pen versus one dose; 28-day cycle versus calendar month; changed SKU; partial catalogue; challenge page with status 200; duplicate run; older run completing last; timeout after writing; manual override being overwritten.

Use integer pence for payable amounts with a documented percentage-discount rounding rule. Unit rates can be fractional pence: preserve precision for sorting and round for display only. Do not compare different medicines by cost per milligram or assume clinical equivalence. Show initial and repeat costs separately; a fixed-dose recurring-price scenario is not a proposed treatment schedule.

## Multi-brand implications

Shared code does not mean shared collection. Separate deployments can fetch the same pharmacy repeatedly, incur duplicate costs and disagree on prices.

Keep the current independent-database model for the first pilot if needed. Before a second overlapping brand, consider a shared collection service that distributes versioned observations to separate brand databases. Keep rights, affiliate terms, allowed products and publication decisions scoped per brand. This is a proposed change to the platform assumption, not a decision made by this report.

Use source-specific manual overrides with reason, reviewer and expiry. Automated runs may continue gathering observations but must not silently replace a protected override. Make conflicts visible.

## Permissions, publication and security

Keep collection permission, redistribution rights, affiliate eligibility and public medicine-promotion approval as distinct decisions. Robots rules are explicitly not access authorization under RFC 9309; an allowed path alone does not settle terms or reuse rights. [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html).

Click Pharmacy's published affiliate terms prohibit promotion of prescription medication and restricted weight-loss products. The existence of its programme therefore cannot validate revenue or promotional permission for these categories. Confirm applicable terms directly before depending on them. [Programme terms](https://ui.awin.com/merchant-profile-terms/76758).

ASA website guidance restricts POM price-list presentation and price-led encouragement. Adding `noindex` changes search visibility, not whether a publicly accessible page is an advertisement. Recommendation: keep unapproved promotional comparison output behind staff/preview access pending the existing review gate. This does not reopen engineering work or claim that all factual third-party comparisons are unlawful. [ASA](https://www.asa.org.uk/advice-online/health-prescription-only-medicines-websites.html).

Do not build around circumventing access challenges or completing clinical questionnaires to discover a price. Seek an agreed source or record incomplete pricing. Scraping-service subscriptions do not grant provider permission.

Discovered/provider-submitted URLs require SSRF protections: approved destination domains, public-IP checks, redirect revalidation and blocked private/local/metadata destinations, including browser subrequests. Render extracted content as untrusted data and protect stored credentials. [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

## Proposed pilot and acceptance criteria

1. Fix fractional strengths, quantity units, unknown fees and structured discount conditions.
2. Select 3-5 verified providers covering static extraction, a permitted dynamic source, and manual fallback. Add a genuine feed only when access exists; no fictional integration requirement.
3. Map 10-20 exact offers per provider against independently checked reference records. Establish allowed collection and evidence retention first.
4. Implement observations, source jobs, validation and a review queue; run in shadow mode without automatically exposing research prices.
5. Run seven consecutive days, recording freshness coverage, extraction accuracy, failure categories, review minutes and cost per accepted observation.
6. Test recovery deliberately: duplicate/missed jobs, 429/5xx, partial pages, worker crash and layout change. Seven quiet days alone is weak evidence.

Proposed gates, not achieved metrics: zero wrong-product publications; zero unknown-fee ranked totals; every published amount traceable to evidence; at least 95% of scheduled checks completed within the declared deadline; all ambiguous offers withheld; demonstrable recovery without duplicate history or older-price overwrite. Report sample size alongside audited accuracy: a small perfect sample does not prove universal correctness.

Illustrative workload only: the milestone's 50 providers x 20 pages x 2 checks is 2,000 page checks/day, about 60,000 per 30-day month before retries/assets. At an assumed 10 seconds per browser check that is about 167 browser-hours/month. Separately, reviewing just 2% of daily checks at three minutes each costs two staff-hours/day. Neither assumption is a measured forecast; use the pilot to replace them.

Track hosting, browser time, traffic, evidence storage, failed attempts, adapter repair and human review separately. Coverage should expand only when the team can maintain accuracy and freshness within its operating budget.
