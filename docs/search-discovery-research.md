# Search-based pharmacy discovery

Research date: 2026-09-17. Implementation decision pending; no search bot has been installed or enabled.

## Findings

Google identifies automated queries and scraping search results without express permission as machine-generated traffic prohibited by its spam policies. A browser automation library does not change that access condition. CAPTCHA, consent pages, changing markup and rate limits also make an unattended scraper operationally fragile. Source: https://developers.google.com/search/docs/essentials/spam-policies

Google's unusual-traffic guidance explains that automated traffic can trigger reCAPTCHA. A challenge should stop automation and leave any permitted interactive completion to the user; do not implement solvers, token replay, proxy rotation or fingerprint evasion. Source: https://support.google.com/websearch/answer/86640

Google Custom Search JSON API is not available to new customers; existing customers must transition by January 1, 2027. It is therefore unsuitable as the default new integration. Source: https://developers.google.com/custom-search/v1/overview

Brave provides a first-party web-search API, but it returns Brave results rather than Google results. Its public guidance says storage requires a plan explicitly granting storage rights. Our persistent candidate database makes that a prerequisite, not a detail to defer until after building. Do not assume a free allowance includes those rights. Sources: https://brave.com/search/api/ and https://api-dashboard.search.brave.com/documentation/resources/terms-of-service

Third-party Google-result APIs also exist, such as SerpApi. A vendor's availability or legal-protection marketing does not itself establish Google's permission or grant rights to pharmacy-site content. Verify the proposed account's access and retention terms before selecting one; no paid account or subscription is authorized by this research. Sources: https://serpapi.com/ and https://serpapi.com/pricing

## Two implementation paths

1. Free staff-assisted Google discovery: generate search tasks, let staff search in their own browser and submit selected URLs, then automatically normalize/deduplicate the submitted leads and collect permitted pharmacy-site evidence. This preserves Google as the lead source without an unattended SERP scraper. It requires staff time and is not a fully automatic Google bot.
2. Automated search API discovery: select an API and plan that allows the intended searches and persistent leads, store its key through encrypted discovery credentials, and run bounded queries on the staff-configured schedule. This may introduce costs and may change the search engine. It needs an explicit source/budget decision before implementation.

## Proposed bot design after source selection

- Start with queries covering UK online pharmacies, registered pharmacies offering delivery, and regional/country terms. Do not restrict discovery to .uk: genuine UK services also use .com. Regional search parameters bias results; they do not verify jurisdiction.
- Separate search collection from pharmacy website visits. Preserve query, source, URL and retrieval time where retention rights permit. Do not copy snippets or entire pages by default.
- Normalize HTTP(S) hostnames, remove tracking parameters and deduplicate known domains before fetching. Avoid merging distinct businesses merely because their names look similar.
- Use a durable queued worker rather than a long-running Next.js request. Record queued/running/needs-human/completed/failed states, a heartbeat, a checkpoint and counts for fetched/excluded/duplicate/saved leads. Expired workers must not leave an indefinite Running badge.
- Bound queries, pages, requests, bytes and runtime per job. Respect Retry-After and retry transient errors finitely. Stop on CAPTCHA, access denial or login requirements and provide a reviewable reason. No challenge bypass.
- Validate outbound URLs and every redirect; reject loopback, private/link-local networks, embedded credentials and non-HTTP schemes. Search results and staff-submitted URLs are untrusted input.
- Before crawling pharmacy sites, check applicable access rules and robots directives. Use an identifiable crawler and per-host concurrency limits. An API subscription does not grant access rights to third-party pages.
- Collect only useful public business evidence from permitted pages: name, address, domain and claimed registration identifiers. Keep dispensing-pharmacy evidence separate from prescribing-clinic evidence.
- Cross-check identifiers against official sources when available; retain unresolved leads for staff review. Neither a search result, a .uk domain nor a claimed registration number proves eligibility.
- Feed the existing candidate-review workflow; never automatically publish providers or change official identifiers from scraped claims.

## Acceptance checks

- Persist and resume a partially completed job without repeating completed work.
- Reject unsafe URLs and redirects before a network request reaches private services.
- A CAPTCHA/403/429 must produce the appropriate visible stopped/retry state, never zero-results success.
- Deduplicate repeated URLs across queries while preserving allowed provenance.
- Demonstrate relevant new domains alongside false positives; measure staff-confirmed UK eligibility separately from raw lead count.
- Verify saved results and final run status end to end, not only a parser fixture.
- Document actual API cost and retention rights before enabling scheduled collection.

## Next decision

Choose free staff-assisted Google searches or an automated API with an approved budget and retention rights. The earlier suggestion of direct Google scraping should not be treated as a production recommendation. No CAPTCHA bypass will be implemented.
