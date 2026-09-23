# Product updates

## 2026-09-23

- Pharmacy discovery now starts by requiring Google AI to cite a direct public product or treatment listing from the pharmacy’s official site. This filters out consultation-only, prescription-request-only and no-catalogue results before review, while saving the cited listing and supporting evidence with eligible pharmacies.

## 2026-09-22

- The pharmacy review process can now promote audited product-listing pharmacies in a batch when their regulator registration is available, keeping uncertain records for staff review.

- Discovery now continues when a suggested pharmacy website points to a private or otherwise restricted network address, while keeping that unsafe website blocked.

- GPhC discovery now checks every currently registered pharmacy instead of excluding registrations based on a previous run date.

- The pharmacy discovery review list now lets staff select multiple candidates with checkboxes and promote or reject them all at once, instead of one at a time. For new candidates, the same details the full "add pharmacy" form asks for — trading name, legal name, website, regulator, regulator reference, dispensing partner and service regions — can now be edited directly in the list before promoting. Every one of those fields shows as plain text (or a link, for the website) with a small edit icon on hover; clicking switches it to an editable box, dropdown, or region checklist. Service regions can now have more than one selected at once, matching the full "add pharmacy" form, and website addresses are clickable links that open in a new tab. The list now also has page controls (25/50/100/200 rows per page) and scrolls sideways instead of squashing every column, now that it shows more fields per row.

- The "Promote" button on a new discovery candidate now saves the pharmacy right there in the review list, using whatever was typed into that row, instead of opening a separate "add pharmacy" page.

- Discovery now continues when a suggested pharmacy website has an expired security certificate, recording the homepage verification issue for review.

- Discovery now saves GPhC registration numbers found in Google AI answers when the original source did not include one.

- Discovery now continues when a suggested website gets stuck in redirect loops, instead of failing the whole source run.

- Human scraping now uses the same Chrome session as Google AI when that browser is already open, so staff can clear website checks in that familiar window.

- Human scraping now stops when a website keeps bouncing the browser through security-check pages, so staff see a clear blocked-site message instead of a stuck browser loop.

- Human scraping now remembers its browser session, waits for verification to remain cleared, and reports repeated security challenges instead of continuing through more pages.

- Product variants now offer “Human scrape”: complete website verification in the opened browser and scraping continues automatically in the same session.
- Human-assisted price collection no longer requires pressing Enter in a terminal after completing verification.

- Variant scraping now checks pharmacy websites even when no product matches have been confirmed yet.
- Product discovery now recognizes medication links such as those used by Peak Pharmacy.

- Adding or editing a pharmacy now lets staff select multiple service regions from a dropdown, with existing selections preserved.

- Website addresses in the discovery review list are now clickable and open the pharmacy website in a new tab.

- Pharmacy discovery now stops with a clear message when Google reaches its AI request limit, keeping saved candidates so staff can retry later.

- Pharmacy discovery now waits for usable website links and continues past candidates with no suitable result, rather than failing the whole run.

- Pharmacy discovery now retries slow homepage checks once, then continues using the existing review fallback instead of stopping the whole run on a timeout.

## 2026-09-21

- The Google AI dev command now opens the Chrome debugging browser again when one is not already running, then starts the dev server with the correct browser connection.

- Product-variant scraping now also checks active pharmacy websites when there is no confirmed match yet, so providers like Medy can appear in variant price results after scraping.

- The product-variant scrape icon now spins while a scrape is running, so staff can see the row action is in progress.

- The product-variant scrape button now works for pharmacy pages that list many strengths and pack sizes together, saving the exact row for the selected variant instead of requiring a separate confirmed match for each row.

- Price reports now include strength-and-quantity price tables from pharmacy pages like Medy, so Viagra rows such as 25mg, 50mg and 100mg packs are visible in the saved report.

- Fixed the product-variant edit form so switching between variants no longer causes a browser console warning.

- Pharmacy pages now have a full price-collection panel: staff can see the chosen product variant, collect or refresh the latest draft price, set daily/weekly/monthly checks, and see when a page needs human verification.
- The product-match review queue now has a "Confirm & scrape" action, so staff can choose the exact variant and save the scraped draft price in one click, with the saved update time shown afterward.
- The product-variant list now has actions to scrape prices for that exact variant and open a variant price page showing each pharmacy's price, delivery charge, total, last update, and price history.
- Price reports now have a staff-assisted browser mode for pages that ask for human verification, so staff can clear the check once and let the report continue reading public price details.
- Price reports now try a rendered browser check for public pharmacy pages when the simpler page read is blocked, so more provider prices and discounts can be reviewed in the saved report.
- Price reports now read dynamically loaded product prices and keep delivery fees separate. Medy Viagra correctly shows from ?4.99 per pill, with ?3.99 postage.

## 2026-09-18, later same day (5)

- Ran the product detection for real against the three pharmacies we've confirmed have working online product pages (Click Pharmacy, The Independent Pharmacy, Treated.com). 18 real product matches are now waiting in the Reviews page for staff to check and confirm — including three separately-priced Viagra/Sildenafil products found on Click Pharmacy alone (branded Viagra, generic Sildenafil, and Viagra Connect, each at a different real price).

## 2026-09-18, later same day (4)

- Added the first real price checking: once a staff member confirms a product match, a "Collect price" button on the pharmacy's page reads the real price straight from that pharmacy's own product page. Tried it for real against Click Pharmacy's Viagra page and it correctly picked up the price (£27.99) and delivery fee (£3.49). Collected prices aren't shown to customers yet — they stay in draft until a staff member reviews and publishes them, same as today's manual pricing screen.

## 2026-09-18, later same day (3)

- Added automatic product detection: a "Detect products" button on each pharmacy's page scans that pharmacy's own website to work out which ED medicines it sells, and lists the matches on a new "Product matches" tab on the Reviews page for staff to confirm or reject — nothing goes live until a staff member approves it. Tried against the 13 real pharmacies already added: 3 found real matches straight away, a handful were blocked by the pharmacy's own bot-protection (expected, and already flagged as a known limitation in our scraping research), and a few didn't have anything in a recognisable format. This is the first step toward automatic daily price checking, which comes next.

## 2026-09-18, later same day (2)

- Removed weight-loss (Mounjaro/Wegovy) from the product catalogue and admin screens, per your direction to focus only on ED medicines for now — the "Category" field is gone from the product-variant screen, and the 3 weight-loss demo entries have been removed.

## 2026-09-18, later same day

- Added 5 more well-known, real online pharmacies (SimplyMeds Online, myPharmacy Direct, Online Chemist, Lloyds Clinical, My Pharmacy Online) to the admin pharmacies list, the same individually-checked way as the batch below — 13 real pharmacies now seeded in total.
- Added 8 well-known, real online pharmacies (Treated.com, The Independent Pharmacy, Medino, Pharmica, Chemist4U, Pharmacy2U, Click Pharmacy, Oxford Online Pharmacy) to the admin pharmacies list, so pricing work can start on real providers straight away. Each was individually checked against the official pharmacy regulator's public register before being added, and starts at the same "discovered" stage as any other new pharmacy — nothing is published or shown to customers yet.

## 2026-09-18

- Discovery now works through the full source result list instead of only checking the first ten, and can use Google AI Mode's own delivery evidence when a pharmacy website blocks automated homepage checks.
- Discovery can now reuse a private local Google browser session, so AI Mode can stay signed in after a one-time manual login with 2FA.
- Discovery checks results for duplicates, then uses Google AI Mode to find pharmacy websites and checks for delivery and contact details before saving them.
- Discovery reports when Google AI Mode is unavailable instead of showing a misleading successful search with no results. The first live attempt was blocked by Google, so no new pharmacies were added.

## 2026-09-17

- Fixed a real bug in the GPhC (regulator) pharmacy-finder that was silently rejecting every pharmacy in the downloaded register, meaning it had never actually found anything since it was built earlier today. It's now correctly finding pharmacies from the file. It will still show "nothing new" for a little while, though — the regulator's own published file is currently a few months old (they update it quarterly), so there's genuinely nothing newer to find until their next update comes out. This isn't a fault in our system.
- The GPhC (regulator) pharmacy-finder is now fully working — it downloads the official public register and finds newly-registered pharmacies automatically. Note: whether we're allowed to keep reusing this particular file hasn't been formally confirmed with GPhC yet — flagged as an open item to sort out before public launch.
- The "Run now" results panel now shows the exact web address that was checked, with a copy button — useful for double-checking a result yourself. Access keys are never shown in it, only a placeholder marking where one was used.
- **Action needed:** while testing the change above, the Companies House access key was accidentally cleared and needs to be re-entered on the Discovery sources page — sorry for the inconvenience.
- Added a "Raw JSON" view to the "Run now" results panel — a toggle next to the table lets you see exactly what each official source sent back, with a one-click copy button.
- The "Run now" results table now shows each pharmacy's postcode and registration number, not just its name and website.
- Fixed repeat NHS ODS discovery runs failing with a date-limit error even when the previous run was recent.
- CQC discovery now scans the register in larger batches, reducing waiting time; a live check found 12 pharmacy candidates.
- Unfinished discovery runs now show “Awaiting completion” instead of a misleading zero-candidate count.

## 2026-09-16

- The NHSBSA pharmacy-finder is now fully working — it finds real online ("distance-selling") pharmacies from official NHS records, no setup needed.
- CQC discovery now accepts one subscription key without a partner code, checks all result pages, and retrieves website details for matching pharmacy candidates.
- Fixed the Companies House pharmacy-finder incorrectly showing "Failure" when it actually ran successfully and just found nothing new that time.
- Fixed the API key field on the Discovery sources page so it accepts typed input properly — it was fighting with browser password managers.
- Clicking "Run now" on a pharmacy-finding source now shows what it found right there on the page, as a table — no need to go looking elsewhere to see the results.
- Staff can now enter and update the access keys for each automatic pharmacy-finding source directly in the admin area, instead of needing a developer to set them up separately. Keys are stored securely (encrypted) and are never shown again on screen once saved — only whether a key has been set.
- The Discovery sources screen can now also add a new source (once one exists to add), not just edit the ones already there.
- Added the first automatic pharmacy-finding tools: staff can now see which free official UK sources (Companies House, the Care Quality Commission, and NHS records) are checked for candidate pharmacies, and choose how often each one runs — daily, weekly, monthly or quarterly.
- Pharmacies found automatically now appear in the same staff review area as evidence and reported issues, showing when the system thinks it may already be a pharmacy we know about, so staff can confirm before anything is added.
- Staff adding a pharmacy found this way now get its name and website filled in automatically, instead of typing everything from scratch.

## 2026-09-15

- Staff can now open a pharmacy's own page to edit its details, move it through the review stages (with a confirmation step for withholding or archiving a listing), and see its evidence and reported issues at a glance.
- Staff can now build a catalogue of medicine pack types (ingredient, strength, formulation, pack size), and attach priced offers — with optional discounts — to any pharmacy.
- Added a review queue so staff can approve or reject submitted evidence, and claim and resolve reported issues, in one place.
- Administrators can now create staff accounts, assign roles, and deactivate accounts that should no longer sign in.
- Added a searchable, filterable history log of every change made in the staff area, for accountability.
- Added a new analytics page with charts covering the pharmacy review pipeline, catalogue mix, offer availability, review-queue status, recent staff activity and team composition — plus a short summary of the same charts on the main dashboard.
- Published a new "Pharmacy evidence and checks" page explaining how we verify a pharmacy before listing it — what we check, the regulator's own standards in plain English, how evidence checks differ from customer reviews, a four-step guide to checking a pharmacy's registration yourself, and answers to common questions. We deliberately don't publish a single combined "pharmacy score" — we show the underlying evidence instead.
- Redesigned the staff area with a proper dashboard layout: a collapsible side menu, a header with a pharmacy search box, a light/dark mode switch, a notifications button and an account menu.
- Staff can now search the pharmacy list by name or website address.
- Added a private staff sign-in area for the team who will manage the pharmacy directory, with a dashboard showing how many pharmacies are at each review stage.
- Staff can now add a pharmacy to the directory by hand from a form, ready for the review steps that come before anything is shown publicly.
- Added ED-only header menus for Pharmacies, Prices, Guides, Side Effects, Tools and Trust, with mobile navigation.
- Added 50 coming-soon pages explaining the planned features and their remaining work.
- Added a build-progress page showing manual pharmacy listings and automatic discovery as the first priority.
- Added persistent preview labels so visitors can distinguish the page preview from working pharmacy and price services.
- Updated the homepage to describe the planned ED service and removed sample customer-savings claims.



