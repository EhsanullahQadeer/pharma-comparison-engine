# Product updates

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
