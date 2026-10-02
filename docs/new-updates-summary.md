# Product updates

## 2026-10-02

- "Detect products" no longer mistakes advice articles or patient-leaflet PDFs for product pages when they sit in a pharmacy’s erectile dysfunction section, for example "How sildenafil works" or "Sildenafil vs Viagra" on Medicina Pharmacy.
- Cleaned up 42 old product matches across 10 pharmacies that had been confirmed against a product the page doesn’t sell: articles, leaflets, or Viagra Connect and Cialis Together pages matched to a prescription product. They had never produced a price and kept showing as failed.
- In the admin panel's narrow icon bar, every icon now opens the same small menu on hover when the side menu is closed, showing the section name and its pages. Icons for sections with one page still go straight to that page when clicked.

- In the admin panel's narrow icon bar, sections with several pages (Reviews and Reports) are now a single icon each. With the side menu closed, hovering over that icon opens a small menu to its right listing the section's pages; clicking the icon opens it too. Sections with one page are still a single click.

- Fixed the small hover labels on icon buttons being hidden behind a table's heading row. On the first rows of a list, the label for a button (for example "Human-assisted") was cut off by the "Actions" heading; it now always shows on top.

- New "Clicks to pharmacies" report in the admin panel, under Reports in the side menu (also linked from the Analytics page). It shows how many visitors we sent to pharmacy websites over a period you choose: the last 7, 30 or 90 days, all time, or any two dates.
- The report has three lists: clicks for every pharmacy, clicks for every product (with strength and pack size), and which product was clicked at each pharmacy. Each line shows the number of clicks, its share of all clicks and when the last click happened, and every list can be sorted.
- Four totals sit above the lists: clicks to pharmacies, pharmacies clicked, products clicked, and clicks filtered out as likely bots (these are never counted in the figures).

- Fixed table columns overlapping each other across the whole admin panel and public site (for example, long email addresses running into the Role column on the Staff page). Every column is now at least as wide as its content, and a table that no longer fits the screen scrolls sideways. Columns can still be dragged wider.

- On a pharmacy's admin page, the "Detect products" button moved into the title bar of the "Prices" list, next to "Publish all" and "Add offer", and the three buttons are now the same height.

- On a pharmacy's admin page, the "Offers" and "Price collection" lists are now one list called "Prices". Each price appears once, with its product, price and delivered total, availability, whether it is on the public site, the latest price check, its schedule and all its buttons on one row. Before, every collected price appeared twice, once in each list.
- In the "Prices" list, a price typed in by hand shows "Entered by hand" and "Not tracked"; a product page that has not been read yet shows "Awaiting price".
- One toolbar above the "Prices" list covers everything for the ticked rows: Publish, Unpublish, Schedule, Scrape now, Human-assisted scrape, Reject and Remove.
- A price collected from a product page can now only be taken away with "Reject", which also stops the page being checked. "Remove" is kept for prices typed in by hand. Before, removing a collected price left its page being checked, so the price came back on the next check.

- The "Suggested product matches" list is more compact. The four buttons on each row are now small icon buttons side by side (confirm and scrape, confirm only, human-assisted scrape, reject), each with a label when you hover over it, and the variant picker is smaller. On a narrow screen the list scrolls sideways instead of squeezing its columns.
- The "Suggested product matches" list (on a pharmacy's admin page and on the Reviews page) now has tick boxes and a toolbar for working on several suggested pages at once: "Confirm & scrape", "Confirm", "Human scrape" and "Reject". Confirming uses the exact variant chosen in each row; ticked rows with no variant chosen are skipped and counted in the result. Scraping goes through the pages one at a time and can be stopped in between. "Reject" asks for confirmation first.
- Removed the "Back to pharmacies" link from the top of a pharmacy's admin page. The "Pharmacies" item in the side menu goes to the same place.
- On a pharmacy's admin page, the affiliate programme box and the "Delivery charge and discounts from the website" box now sit side by side on a large screen, instead of one above the Offers list and one below it. On smaller screens they stack.
- In the admin panel, the button or search box in a list's title bar now sits in the top-right corner, level with the title, instead of dropping onto its own line underneath. This fixes "Add offer" on a pharmacy's Offers list and the same layout on the pharmacies, product variants, product prices, inbox, audit log and discovery candidates lists.
- Every list in the admin panel can now be sorted: click a column heading to sort by it, click again to reverse the order, and a third time to go back to the normal order. An arrow on the heading shows which column is in use. Columns that only hold buttons or free text are not sortable.
- Every list in the admin panel now has page controls underneath: "Page 1 of 3 (61 total)", previous and next buttons, and a "Rows per page" choice of 25, 50, 100 or 200. This covers the pharmacies list, each pharmacy's Offers, Price collection and Suggested product matches, the prices for a product and their history, discovery sources, everything on the Reviews page, staff, articles, the inbox, the audit log and product variants.
- In lists with tick boxes, "select all" now ticks only the rows on the page you are looking at, so a bulk action never touches rows you can't see.

- When a table is wide enough to scroll sideways, its scroll bar is now a slim bar on its own, without the white strip and arrow buttons behind it.
- Fixed the "Price collection" list on a pharmacy's admin page overlapping its own text on smaller screens. Each column is now as wide as its content, and on a narrow screen the list scrolls sideways instead.
- Every table now has a square-cornered heading row, with only the bottom corners of the table rounded. Before, the heading row's top corners were rounded too, which looked out of place under a toolbar.
- On a pharmacy's admin page, the "Price collection" list is more compact, so each product page takes about half the height. The three stacked buttons on each row ("Refresh price", "Human-assisted", "Reject") are now small icon buttons side by side, each with a label when you hover over it. The last and next check times share one line, the price shows "Published" or "Draft" beside it, and the schedule tick box, frequency and save button sit on one line.
- On a pharmacy's admin page, the "Price collection" list now always shows its toolbar for working on several product pages at once: tick the pages, then choose "Schedule", "Scrape now", "Human-assisted scrape" or "Reject". Before, the toolbar only appeared after a page was ticked, so it was easy to miss.
- "Human-assisted scrape" is new in that toolbar. It works through the ticked pages one at a time in the visible Chrome window, so a person can complete any security check, and it can be stopped between pages.
- Price collection and "Detect products" can now read The Independent Pharmacy's product pages, where each strength is sold as one, two or three packs. For example, Cialis Once Daily 5mg is £87.99 for 28 tablets and £155.98 for 56. This also brings in all the strength and pack options on its Viagra, sildenafil, Cialis and Viagra Connect pages.
- On a pharmacy's admin page, the "Delivery charge and discounts from the website" box takes up less room: the "Check website now" button now sits in the top-right corner instead of stretching across its own row, and each finding shows its website wording, source link and "last seen" date on one line.
- On a pharmacy's admin page, a long error message in the "Price collection" list now wraps onto several lines inside its row. Before, it ran on one line and pushed the list wider than its box, so the right-hand buttons were cut off.
- On a pharmacy's admin page, the "Offers" list has a new "Product" column showing the product's name (for example "Viagra", "Cialis Together" or "Generic sildenafil") next to the medicine, strength and pack size. Before, a Viagra price and a generic sildenafil price both read just "Sildenafil 50mg × 4".
- Price collection and "Detect products" can now read product pages that put strength, pack size and price together in a single dropdown, such as Cloud Pharmacy's: for example "10mg x 4 — £18.99" on its Cialis Together page. It also records whether each option is in stock.
- "Detect products" now suggests each strength and pack size only once per pharmacy, on that product's own page. Before, the same option could be suggested several times when a pharmacy also listed it in a comparison table on other product pages.
- Fixed comparison tables that include a medicine we don't cover (for example Vardenafil) having that row's price read as tadalafil or sildenafil.
- The admin panel is more compact, so more fits on screen with less scrolling. Table rows are noticeably shorter, boxes have less padding, and the gaps between sections and around the page are smaller. The sidebar, the top bar and the public site are unchanged.

## 2026-10-01

- On the admin Reviews page, the Promoted and Linked lists under "Discovery candidates" now have tick boxes and a "Detect products" button above the list. Tick several pharmacies (or all of them) and one click checks each pharmacy's website for products, one pharmacy at a time. A progress line shows which pharmacy is being checked, a "Stop" button ends the run after the current pharmacy, and the result says how many pharmacies were checked and how many new products were found. The "Products found" column updates when the run ends.
- On a pharmacy's admin page, each product page in the "Price collection" list now has a "Reject" button, and "Reject" is also in the toolbar that appears when several pages are selected. Rejecting takes the page out of price collection, stops its scheduled checks, and stops it being suggested again. It is meant for a page that is the wrong product, repeats another page, or never gives a price.
- If a rejected page already had a saved price, that price is removed with it, including from the public site if it was published. A confirmation message says how many prices will be removed before anything happens.
- On the admin Reviews page, the Promoted, Linked and Rejected lists under "Discovery candidates" have a new "Products found" column. It shows how many products have been found on that pharmacy's website, not counting ones staff have rejected.
- On the admin Reviews page, the tab you are on is now part of the page address. Refreshing the page keeps you on the same tab, the browser's back and forward buttons move between tabs, and a copied link opens the same tab for a colleague. This also covers the Pending, Promoted, Linked and Rejected tabs inside "Discovery candidates".
- The "Prices" menu on the public site now starts with "Prices by product" (Viagra, Viagra Connect, Generic sildenafil, Cialis, Cialis Together, Generic tadalafil). The comparison page and the Sildenafil and Tadalafil pages follow it.
- On the comparison page, the first filter is now "Product", with one choice per product. It replaces the old "Brand" filter, which only appeared useful after choosing a medicine. The "Medicine" filter is still there underneath, for seeing every product of one medicine together.
- The comparison page's description now names products ("Viagra, Cialis and generic prices") rather than only the medicines.
- Prices on the public site are now named by product first, with the medicine underneath. A price that used to read "Sildenafil 50mg × 4 · Viagra" now reads "Viagra 50mg × 4 · Contains sildenafil". Unbranded versions read "Generic sildenafil 50mg × 4 · Unbranded". This applies to the comparison table, the price cards, the pharmacy pages and their questions and answers.
- A pharmacy's page now says which products its prices cover, for example "Cialis, Generic tadalafil and Viagra", instead of naming only the medicines.
- The pack-size comparison is now split by product. Before, one "Sildenafil 50mg" box mixed Viagra, Viagra Connect and generic packs, so a branded pack could be compared with a generic one. Each product and strength now has its own box, such as "Viagra 50mg" and "Generic sildenafil 50mg".
- The bell at the top of every admin page now shows how much work is waiting. A number on the bell gives the total, and opening it lists each kind of work with its count and a link to where it is done: pharmacy candidates to review, product matches to confirm, evidence to approve, corrections to resolve, new inbox messages, articles waiting for review, delivery charges and discounts to approve, price checks that need attention, and draft prices to publish.
- The dashboard has a new "Pending work" section with the same list in full. For work done on a pharmacy's own page, it names each pharmacy with its count, and each name opens that pharmacy.
- Each staff member only sees the kinds of work their role can act on. A notification disappears by itself once the work is done; there is nothing to mark as read.
- The number on the bell updates by itself, without reloading the page: straight after a staff action such as approving, dismissing, confirming or publishing, and every 30 seconds for work that arrives in the background, such as a failed price check or a new message.
- Links from the bell to the Reviews page open the right tab straight away.
- The website check for delivery charges and discounts now also reads a pharmacy's product pages when its delivery page and homepage don't state a charge. This found the delivery charge for Medy (£3.99), Click Pharmacy (£3.50) and LloydsDirect (£4.95).
- The check has been run on all 85 published pharmacies. 17 delivery charges and 4 discount offers are waiting for approval on the pharmacies' admin pages. Nothing has been applied to prices or shown to the public.
- The discount check now ignores offers for a pharmacy's other services, such as weight-loss consultations, and labels a reward for returning customers as "Returning customers" rather than a first-order discount. Two weight-loss offers it had suggested earlier were removed from the approval list.
- A website that can't be reached during a check is no longer counted as checked, so an approved delivery charge or discount isn't wrongly marked "Not found on the last check".
- The public site now has a price page for each product, not only for each medicine: Viagra, Viagra Connect, Generic sildenafil, Cialis, Cialis Together and Generic tadalafil. Each page shows only that product's prices by strength and pack size, and states whether it is prescription-only or a pharmacy medicine sold without a prescription.
- The six product pages are in the "Prices" menu under "Prices by product" and on the site map.
- The Sildenafil and Tadalafil price pages now start with a "Choose a product" section linking to their products, with the number of prices on record and the lowest price per tablet for each.
- The strength-and-pack cards now open the comparison for that exact product. Before, a Viagra card opened a list that also included generic and Viagra Connect prices of the same strength and pack.
- The Viagra Connect and Cialis Together pages can be found by search engines, because those two are sold without a prescription. The pages for prescription-only products stay hidden from search engines, as all prescription price pages already are.
- Price collection no longer saves a second price for a product a pharmacy already has a price for. This happened when the same pack was listed on two of a pharmacy's pages, for example Dr Fox's Cialis page and its Tadalafil page, and showed the product twice. The repeated page is now marked "Needs review" on the pharmacy's admin page, with a note saying which page the existing price comes from, and its automatic price checks are switched off.
- Duplicate prices saved before this change are still on record: 36 products across 7 pharmacies, 29 of them at Dr Fox. They have not been removed yet.
- The system can now read a pharmacy's delivery charge and discount offers from its own website. Each pharmacy's admin page has a new "Delivery charge and discounts from the website" section showing what was found, the exact wording it was read from, and a link to that page.
- Nothing found this way is used or shown to the public until a staff member approves it. Each finding has "Approve" and "Dismiss" buttons, and a dismissed finding is not suggested again unless the website changes.
- Approving a delivery charge sets it on all of that pharmacy's prices, including free delivery above a spending level where the pharmacy offers it (for example "£2.95, free on orders of £39 or more"). Later price checks keep using the approved charge.
- A price check on its own no longer changes the delivery charge of a price already on record. Before, a check that couldn't see the delivery charge could reset it to £0.
- An approved discount (for example "10% off with code WELCOME10" for new customers) is shown beside every price from that pharmacy. It is not subtracted from the total, because not every shopper qualifies.
- The website check runs automatically after a price check, at most once a week per pharmacy, and can be run at any time with the "Check website now" button. If an approved discount or delivery charge is no longer on the website, it is marked "Not found on the last check" so staff can remove it.
- Websites that show a "verify you are human" check can't be read this way yet; their delivery charge and discounts still need to be entered by hand.
- On a pharmacy's admin page, the website address under the pharmacy name is now a link that opens the pharmacy's website in a new tab.

## 2026-09-30

- Price collection can now read treatment lists split into sections by product, where each row only shows the strength, pack and price. Rx Live Clinic's online-clinic page is an example: "Viagra (Branded)" then "50mg · 8 tablets … £44.99". Each price is matched to the product whose section it sits in. Sections for medicines we don't compare, such as Vardenafil or Spedra, are skipped.
- Rx Live Clinic now has 17 suggested product matches waiting on its pharmacy page, covering its Viagra, generic sildenafil, Viagra Connect, Cialis and generic tadalafil options.
- "Detect products" can now read the product lists of websites built on BigCommerce, such as Well, whose product list the system couldn't open before. On Well it now finds 33 erectile dysfunction product pages and 24 priced strength/pack options, including Viagra Connect, Cialis Together and the subscription packs.
- Fixed pages being mistaken for erectile dysfunction products because a medicine name appeared inside another word. For example, Well's "Specialist Skincare" page was matched because "specialist" contains "cialis".
- Web pages whose address includes extra details after a "?" (for example a product number) are now opened exactly as given. Before, those details were dropped and the wrong page could be read.
- Price collection now works on shops that ask for a postcode before showing a product, such as Oxford e-Pharmacy's online shop. It enters the pharmacy's own postcode, the same way "Detect products" already did. Oxford e-Pharmacy's Viagra Connect (£10.99 for 2, £19.99 for 4, £34.99 for 8) and generic sildenafil (£14.99 for 4, £26.99 for 8) can now be collected.
- Price collection no longer mistakes a basket "Quantity 1" box for the pack size, and understands pack sizes written like "Tablets (4)".
- When a price is read from the page as displayed, it now also checks the product is branded or generic as required, so a generic sildenafil price is never recorded as branded Viagra.
- Fixed Dr Fox and similar websites being wrongly treated as blocking us. Their site rules block certain other named web crawlers, and one of those names ("rma") happened to appear inside ours. We were applying that crawler's block to ourselves. Dr Fox's product pages can now be read.
- Fixed a case where a price table listing both generic and branded tablets could record a generic price as the branded one. On Dr Fox's Viagra page, for example, generic sildenafil 25mg × 32 at £22 was being read as branded Viagra. Each row is now matched to the product it names, so a generic "Sildenafil 50mg" row on a Viagra Connect page is never taken as Viagra Connect.
- "Detect products" now picks up every strength and pack size a pharmacy offers in its dropdowns, buttons or price tables, not just the ones already in our catalogue. For example, all 12 Viagra options on Pharmulous and all 25 on Simple Online Pharmacy.
- Any strength or pack size that isn't in the catalogue yet is added automatically, along with its brand, whether it's branded or generic, and whether it's prescription-only. The message under the "Detect products" button says how many were added. Each match still needs a staff member to confirm it before a price is collected.
- Daily tadalafil 2.5mg can't be added yet, because the catalogue only stores whole-number strengths.
- When confirming a product match, the variant list no longer picks a product for you, which made it easy to confirm a page against the wrong product. It is only filled in when "Detect products" found that exact product priced on the page; otherwise you choose it, and the confirm buttons stay unavailable until you do.
- The variant list now shows the brand as well as the medicine, for example "Viagra Connect (Sildenafil) 50mg × 4" and "Viagra (Sildenafil) 50mg × 4", so similar products can be told apart.
- Price collection can now read strength and pack-size dropdowns like those on Simple Online Pharmacy's product pages. It keeps the branded (Pfizer) options separate from the generic ones: for example Viagra 50mg × 4 at £29.95 and generic sildenafil 50mg × 4 at £7.49. Sale prices are used only when an option is marked as on sale.
- "Detect products" no longer mistakes health-advice articles for product pages, for example "How does Viagra work?" on Simple Online Pharmacy.
- Price collection and "Detect products" no longer give up on product pages just because the page has a spam-protection box on a form, such as a newsletter sign-up. Pages that really are a "verify you are human" check are still stopped as before. This affected Pharmulous, whose Viagra and Cialis prices can now be collected.
- Price collection now understands pack sizes written with the count first, such as "Viagra Tablets 4 x 50mg" (£34.99 at Pharmulous).
- Price collection can now read the strength and pack-size options on SynovaMed's product pages, for example Cialis Together 10mg × 4 at £19.99. It uses the one-off purchase price, not the subscription price, and records whether the option is in stock.
- Fixed a case where price collection could record an over-the-counter product's price (Cialis Together, Viagra Connect) as the price of the prescription medicine. It happened when the price was read from the page as displayed, rather than from the page's built-in price data.
- Price collection and "Detect products" can now read the strength and pack-size options on pharmacy websites built like Pharmacy Online's, for example £29.99 for Viagra 50mg × 4. Sale prices are used only while the sale is on, and prices for other products shown on the same page are ignored.
- A pharmacy's admin page now lists its suggested product matches in a "Suggested product matches" section just above Price collection. Staff can confirm (with or without collecting the price straight away) or reject each one there, without going to the Reviews page.
- Confirming or rejecting a match, on either page, now updates the pharmacy's Price collection list straight away.
- "Detect products" now finds products on pharmacy websites whose product pages have short addresses such as "/uk/viagra.html", like Zava. Pages about side effects, dosage or alternatives are still ignored, as are the same pharmacy's pages for other countries.
- "Detect products" now also looks through a pharmacy's erectile dysfunction page for links to products. This finds product pages the pharmacy doesn't list elsewhere, such as Zava's main Viagra page.
- Price collection can now read price lists laid out with one column per strength and one line per pack, such as "4 tablet(s) - £30.00" under "50 mg" on Zava's pages. Prices shown for other recommended products on the same page are ignored.

## 2026-09-29

- Price collection and "Detect products" now recognise Viagra Connect and Cialis Together pages that don't state the strength (for example Withaid's "Viagra Connect 4 Tablets" at £36.09). These products are only sold in one strength, 50mg and 10mg.
- Prices for Viagra Connect and Cialis Together are now always kept separate from prescription Viagra and Cialis, so one can never be recorded as the other.
- "Detect products" now suggests every strength and pack size a pharmacy's product page sells that is in our catalogue, instead of one match per page. For example, My Private Pharmacist's Viagra page now gives three suggestions: Viagra 50mg × 4, Viagra 100mg × 4 and generic sildenafil 100mg × 8. Each suggestion still needs a staff member to confirm it on the Reviews page, where its strength and pack size are already selected.
- These suggestions keep melt-in-the-mouth tablets and over-the-counter Viagra Connect apart from ordinary prescription tablets. A page whose prices can't be read still gets a single match for staff to fill in by hand, as before.
- Fixed "Collect price" on a pharmacy's admin page failing for branded products (for example Viagra) on pages that sell both branded and generic versions. It now finds the branded price the same way the catalogue-wide price check does.
- Price collection can now read product pages where the shopper picks branded or generic, strength and pack size with buttons, such as My Private Pharmacist's Viagra page. It takes the price for the exact combination being checked, and keeps branded Viagra and generic sildenafil apart.
- Price collection can now read price tables that list pack sizes as plain numbers under a "Quantity" heading and show prices without a £ sign, such as Somer Pharmacy's Viagra page. Each price is still taken only from the exact strength and pack size it belongs to.
- "Detect products" on a pharmacy's admin page now finds products on more websites. It first reads the site quickly in the background as before. If the site blocks that or shows no products, it opens the site in the Chrome window and looks again once the page has fully loaded, including the site's erectile dysfunction page.
- If that Chrome window shows a security check, a staff member completes it there. The system never tries to get past it on its own, and sites whose rules refuse automated visits are still skipped.
- Product detection now also recognises products by the name shown on a link (for example "Hezkue (Sildenafil)"), not just by the page address. These are marked as medium confidence for staff to check.
- After a run, the message under the button says when the Chrome window was used.
- "Detect products" now also works for pharmacies whose online shop is on a separate part of their website (for example a "Pharmacy Shop" button leading to a different address), and for shops that ask for a postcode before showing products. It enters the pharmacy's own postcode.
- It can now find products in shops where product cards open when clicked instead of being ordinary links. For example, it now finds five Viagra Connect and sildenafil products at Oxford e-Pharmacy, where it previously found none.
- Products whose names don't mention the medicine (for example "Erectile Dysfunction Relief 50 mg") still need to be added by staff, because the system can't tell which medicine they contain.
- Fixed pharmacy discovery's "Run now" sometimes stopping with a browser error while it looked up a pharmacy's website through Google AI Mode or DeepSeek. It now waits for the AI answer to finish loading instead of failing.
- The homepage has been redesigned with a clearer, more modern layout. The main message and "Compare prices" and "Browse pharmacies" buttons now sit at the top, with live counts of how many pharmacies and prices are available.
- A new row of headline numbers shows how many pharmacies we've checked, how many are listed, that no price is ever more than 48 hours old, and that the site is free to use.
- New homepage sections: a four-step "How it works", a side-by-side "Why compare with us", an "About us" section explaining how we stay independent, a testimonials section and a contact form.
- The testimonials are sample wording for now and are labelled on the page as examples. They should be replaced with real, permission-given feedback before launch.
- The contact form on the homepage works the same way as the one on the Contact page, with quick links to report a wrong price or suggest a pharmacy.
- Cards and sections now fade in gently as you scroll and lift slightly when you hover over them. Visitors who have reduced motion turned on in their device settings see everything without animation.
- The homepage works in both light and dark mode and on phones, tablets and desktops.
- Automatic price checking is now ready to run on the server around the clock. If a pharmacy website is briefly down or slow, the check is tried again after 5, 15 and 60 minutes instead of being given up on.
- Pages that block automatic checks, or where no matching price can be found, are no longer checked over and over again. They wait until their next scheduled check and are shown to staff to look at.
- Once automatic checking is switched on, price changes for pharmacies already on the site will go live straight away, with no staff approval needed.
- Prices that can't be real are now refused automatically: £0, less than 10p a tablet, or more than five times higher or lower than the current price. The current price stays up, and the pharmacy's page in the admin shows the check as failed with the reason. This would have stopped an earlier mistake where one pharmacy's £24 Viagra pack was briefly recorded at 24p.
- If a pharmacy really does change a price by that much, staff can enter the new price by hand.
- The price comparison page has three new filters: brand (Viagra, Viagra Connect, Cialis or generic), tablet form (standard or melt-in-the-mouth) and one-off or subscription. The form and one-off/subscription filters only appear when there's a real choice to make.
- There's no delivery filter yet. Most pharmacies' delivery charges and delivery areas haven't been confirmed, so a "free delivery" filter could show prices whose delivery cost we don't actually know. It will be added once staff have confirmed delivery details.
- The whole public site was checked against the web accessibility standard (WCAG AA) in light and dark mode, and every problem found was fixed. Dark mode's green "Compare prices" and "Browse pharmacies" buttons now have dark, readable text. Grey table headings and red "Out of stock" labels are a little stronger. Numbered source links in articles are easier to tap on a phone and are read out as "Source 1", "Source 2" and so on. The heart-health checklist no longer shows tick boxes that screen readers announced without a name.
- Closed a gap where the admin's price-collection function could, in principle, be triggered from outside without signing in. Only signed-in staff and the scheduled price checker can run it now.

## 2026-09-26

- The price comparison table no longer has a last column that said "Listed for comparison" on every row. That column now appears only when a partner pharmacy is in the list, and then only partner rows show a "View" button.

- The price comparison table now shows each pharmacy's logo where we have one (41 of the 66 listed pharmacies so far; the rest still show their initials).
- The comparison table no longer has a separate Consultation column. Any consultation fee is still included in the total, and the total says so when there is one.
- A new Offers column in the comparison table shows any checked discount for that price, with its code. It links to the pharmacy's page, and says "No discount listed" when we don't have one.
- Each pharmacy's page has been redesigned around offers and discount codes: its logo, its best current offer, any checked codes with a copy button, how ordering works, its registration checks, a full-cost checklist and common questions.
- There are now 10 different designs for pharmacy pages. Each pharmacy always gets the same one, so pages look varied across the site but never change for a given pharmacy.
- Staff can now add a discount code when recording a discount, and set or change a pharmacy's logo from its edit form.

- The staff dashboard now only accepts staff accounts, ready for pharmacy partner logins later. Everyone needs to sign in again once.
- Switching off a staff account, or changing someone's role, now takes effect straight away instead of when they next sign in.

- Partner pharmacies' "View" buttons are now labelled "Partner · we may earn commission", linking to the independence page.
- The Independence page and the page for pharmacies now list our partner pharmacies automatically. While there are none, they say so, and they explain that partners get a link but never a better position.
- The admin page for each pharmacy has a new Affiliate programme section. Staff can record the programme's network, commission, terms and tracked link, see an example of the finished link, and set it to Applied, Active, Paused, Rejected or Ended. Only commercial managers and administrators can change it, and every change is logged.
- A programme can only be made active once staff confirm its terms allow comparing prescription medicines and add a link to those terms. Making it active also marks the pharmacy as a partner.
- While a pharmacy's programme is active, clicks on its prices go through the programme's tracking link, so sales can be credited to us. Each click carries only an anonymous reference number, nothing about the visitor.
- Public pages now update as soon as staff publish prices or change partners, instead of up to five minutes later.

- Pharmacy pages now only link to a pharmacy's website if it is one of our partner pharmacies. Other pharmacies are still shown in full, with their prices, registration and checks, but with no link to their site. This works the same way on the comparison and price pages.
- Being a partner never changes where a pharmacy appears in the price rankings.
- On the admin page for each pharmacy there is a new "Affiliate partner" tick box to switch its website link on or off. Only commercial managers and administrators can change it, and every change is recorded in the activity log.
- On the admin Reviews page, rejected candidates now have a "Send back to pending" button that returns them to the Pending list so they can be looked at again.
- Promoted candidates now have a "Reject" button. It also archives the pharmacy that was created from that candidate, which takes it off the public site. The pharmacy's details and prices are kept, and it can be restored from the Pharmacies page. Only administrators can do this, because it archives a pharmacy.

- When a visitor clicks "View" on a price, the site now counts that click before sending them on to the pharmacy. Only the pharmacy, product, page and price position are recorded; nothing that identifies the visitor or what they searched for.
- The "View" button only ever sends people to the pharmacy's own website. If a price has been withdrawn since the page loaded, visitors are taken back to the comparison page.
- The admin Analytics page has three new charts: clicks to pharmacies per day (with automated traffic filtered out and shown separately), the pharmacies people visit most, and which pages the clicks come from, including how often people choose the cheapest price.
- The privacy policy now explains that clicks to pharmacies are counted and what is and isn't kept.

- No page on the public site says "coming soon" any more. Every page now has its own content.
- All 12 guides (understanding ED, heart health, options beyond tablets, talking about ED, the treatment overview, sildenafil, tadalafil, your first consultation, choosing a pharmacy, travel and storage, managing treatment, and news and safety alerts) and the 5 tool pages (sildenafil vs tadalafil, onset and duration, strengths, the IIEF-5 explainer and the heart-health checklist) now show full information. Every statement links to a numbered source: NHS pages, the official Viagra, Viagra Connect and Cialis product information, the British Heart Foundation, the MHRA, the pharmacy regulators and UK travel health guidance. Like the Side Effects pages, each one says it has been checked against its sources and is awaiting review by a named clinician.
- New Privacy policy, Terms of use and About pages. The privacy policy describes exactly what the site does: no accounts, tracking or advertising, and only the details people type into a form are kept.
- The "build progress" page has been replaced by an "All pages" site map listing every page with a short description. Old links to it forward automatically.
- The home page, menus and footer now describe the live service instead of a preview, and the editorial policy now explains how guides show whether a clinician has reviewed them yet.

- Viagra Connect is now shown and checked separately from prescription Viagra, so its prices are not mixed together. Four pharmacy prices were rechecked successfully; two pages were left unchanged because they did not clearly show the exact product and pack price. All refreshed prices are still waiting for staff approval before appearing publicly.

- Prices on the comparison page are now ranked purely by price, however long ago they were checked. Prices checked more than 24 hours ago are no longer moved to a separate list. They take their place in the ranking and are marked "May have changed". Only out-of-stock prices are listed separately, at the bottom. Prices older than 48 hours are still hidden until they're checked again. The explanations on the price pages have been updated to match.

- The public price comparison page now shows all prices in one table instead of two. Current, in-stock prices are ranked at the top, and older or out-of-stock prices follow under an "Also listed" divider in the same table, unranked and marked "May have changed".

- The six Side Effects pages (urgent warning signs, common side effects, heart health before treatment, medicine interactions, vision and hearing changes, and contacting your prescriber) now show real information instead of "Coming soon". Every statement has a numbered reference linking to its source: NHS medicine pages and the official Viagra and Cialis product information. Each page clearly says it was checked against those sources and is still awaiting review by a named clinician. The pages stay hidden from search engines until that review is done, and a clinician-approved version replaces them automatically once one is published.

- Search engines can now find every clinically reviewed guide through the site map, with the date each guide was last updated. Published guides also now provide clearer, safe article details for search results. Price-comparison and pharmacy-price pages remain hidden from search until their legal review is complete.

- The public pharmacy directory now shows pharmacies in a table instead of cards. Each row shows the pharmacy and its website, its registration number, where it delivers, its lowest price per tablet and how many prices it lists, when its registration was last checked, and a button to open its page. On phones, you can swipe the table sideways.

- The public price comparison page now shows pharmacies in a table instead of large cards. Each row lists the pharmacy, the product, the medicine price, delivery, consultation, the total, the price per tablet and when the price was last checked, so it's easier to compare them side by side. The cheapest option is highlighted. On phones, you can swipe the table sideways.

- Tick boxes across the admin area now display properly. They were showing as a thin line with nothing to click, and ticked boxes weren't filling in. This affected the Pharmacies list, the price tables and the Reviews page.

- On the admin Reviews page, the two "Filter for ED medicine" and "Human filter" buttons are now one "Filter for ED medicine" button. It checks every pending pharmacy quickly first, then opens the Chrome window only for the sites that blocked the quick check, so you only have to complete verification where it's really needed.

- Every page on the public site is now live except the privacy policy, terms of use and "About us" pages. Those stay as previews until your company details are confirmed.

- New public pages: a pack-size comparison (price per tablet by pack size), repeat and subscription costs, where our prices come from, a pack-cost calculator, how the site works, our independence rules, how we verify and find pharmacies, information for pharmacies, our editorial policy, and three disclaimer and data pages.

- Visitors can now suggest a pharmacy, report a wrong price or detail, and send a message through the contact page. Suggestions and messages appear in a new Inbox in the admin, and corrections go to the existing Corrections review list. The forms have built-in protection against spam.

- There is now a Guides area, a Safety area and a Tools area. The guides, safety and reference pages show only once they have been clinically reviewed; until then each shows a "being written and clinically reviewed" notice.

- New admin Articles section for writing and reviewing these pages. Each article has a named author and a list of sources. It appears on the website only after a different staff member approves it as clinical reviewer, and any later edit takes it off the site until it's reviewed again.

- First drafts of all 23 guide, safety and reference articles have been written from NHS and other official sources and are waiting in the admin for clinical review. None of them is public yet.

- Pages that show prescription medicine prices are hidden from search engines again, as agreed until the legal check on showing these prices is done. The rest of the site can appear in search results once the site goes live.

- The Pharmacies list now has a toolbar on top of the table at all times. After ticking pharmacies, you can move them all to a new status or publish all of their draft prices in one go. Only pharmacies that are already published have their prices published; the rest are skipped and counted.

- Each row on the Pharmacies list now has the same quick actions as the pharmacy's own page: edit its details, publish all of its draft prices (shown only when it has drafts), and change its status.

- The admin Product variants page now has a Schedule column. Pick Daily, Weekly, Monthly or Off for a product, and every pharmacy page confirmed for that product follows that schedule. The button shows the current setting ("Mixed" when pharmacies differ) and when the next automatic check is due.

- On a product's prices page, each pharmacy now has its own Schedule button, so you can set how often that one pharmacy's price is re-checked. Pharmacies still waiting for their first price can be scheduled there too.

- The Pharmacies list now supports bulk status changes. Tick the pharmacies you want (or tick the box at the top to select them all), then use "Move to" to move them all at once, for example to Identity verified or Published. The menu only offers moves the selected pharmacies can actually make and shows how many can make each one. Pharmacies still go through each check in order, so any that can't make the move yet are skipped and counted. Moving pharmacies to Temporarily withheld or Archived asks you to confirm first.

- The public website now has a price comparison page. Visitors can filter by medicine (sildenafil or tadalafil), strength and pack size, and sort by price per tablet or by total price. Each price shows the medicine cost, delivery and consultation charges, the total to pay, the price per tablet, when it was last checked, and a link to the pharmacy's own page.

- New public pages for sildenafil prices and tadalafil prices show every strength and pack side by side, with the lowest price and the price range for each, plus the five lowest prices right now.

- The public pharmacy directory is now live, with a search box. Each pharmacy has its own profile page showing its registration number, the evidence our team checked (with dates), where it delivers, and all of its current prices.

- Only pharmacies set to "Published" in the admin appear on the public site, and only prices a staff member has published. Prices checked in the last 24 hours are ranked. Prices 24–48 hours old are shown separately and marked "may have changed". Older prices are hidden until they're checked again.

- Where a pharmacy's page doesn't show a delivery or consultation fee, the public site says "Not listed" instead of implying it's free, and calls that total "indicative".

- In the admin, each pharmacy's Offers list now has a "Public site" column (Published or Draft), a publish/unpublish button on every price, and a "Publish all" button. Prices can only be published once the pharmacy itself is published.

- The public site's menus now mark which pages are live, and the site banner links straight to the price comparison.

- DeepSeek is paused for pharmacy discovery until its account is available again (planned for 29 September). Until then every new pharmacy is looked up with Google AI, and the Discovery sources page says DeepSeek is paused.

- Prices can now be updated in bulk. On a product's prices page, and in a pharmacy's Offers and Price collection lists, tick the rows you want (or tick the box at the top to select all). A toolbar then lets you publish or unpublish them, set how often they refresh automatically (daily, weekly, monthly or off), refresh them now, or remove them. Refreshing runs one pharmacy at a time, shows its progress and can be stopped part way.

- A product's prices page now shows whether each price is published on the public site or still a draft.

## 2026-09-25

- Pharmacy discovery and price scraping now let go of the Chrome window when they finish. You can sign into Google or DeepSeek in that window between runs without its "are you a robot" check repeating endlessly.

- The admin Reviews page now has a search bar. Type a pharmacy name, website, postcode, link or any other detail to narrow the table you're viewing. It works on every tab, and the counts on each tab update to show how many results match.

- If the Chrome window used for pharmacy discovery and price scraping has been closed, clicking "Run now" on the Discovery sources page, or scraping prices, now opens it again automatically. Google and DeepSeek sign-ins are kept, so you don't need to reopen it by hand first.

- Boots' prices were rechecked and corrected. Viagra 50mg (4 tablets) had been stored at £60, which was actually the price of Boots' "ED Trial Pack". It's now £30. Boots' Viagra 25mg and 100mg (4 tablets) and generic tadalafil 5mg daily (28 tablets) prices were added. Price scraping no longer mistakes a multi-medicine trial pack for a single product, and now prefers prescription Viagra and Cialis over their over-the-counter versions when a pharmacy lists both.

- Price scraping now works on pharmacies whose site rules are hidden behind a security check: Peak, Pharmica, Oxford Online Pharmacy and Your Medicals. When a check appears, the scrape opens the project's Chrome window so it can be completed, reads the site's rules there, and only reads prices if the rules allow it. Twelve new prices were added from Pharmica, Oxford Online Pharmacy and Your Medicals, and Peak's prices were confirmed.

- Price scraping can also read three more shop layouts: Pharmica's per-tablet price lists, strength-by-pack price tables such as Oxford Online Pharmacy's, and Shopify shops such as Your Medicals, Everyday Meds, 365 Pharmacist and 121 Pharmacy.

- Peak Pharmacy prices were added for six catalogue products: branded Viagra 25mg, 50mg and 100mg (4 tablets), branded Cialis 10mg and 20mg (4 tablets), and generic tadalafil 5mg daily (28 tablets). Peak's security check was completed by hand in a Chrome window before the prices were read, after confirming its site rules allow these pages.

- Price scraping is now stricter about branded versus generic medicines. A generic product that only mentions the brand in its name, such as "Sildenafil (Viagra) Tablets", is no longer taken as a branded Viagra price, and a branded Viagra page is no longer taken as generic sildenafil. Seriva was checked: it only sells generic sildenafil in 4-tablet packs, which don't match any catalogue product, so no prices were added for it.

- Mail My Meds is now listed with prices for all seven catalogue products, marked out of stock because the pharmacy currently shows everything as unavailable. Price scraping can now read Mail My Meds' strength and pack options, so its prices and stock status update when it's scraped again.

- Price scraping can now read Treated's price checker, where each strength's pack prices only appear after you choose the strength. Treated's prices for all seven catalogue products were added: Viagra 25mg, 50mg and 100mg (4 tablets), generic sildenafil 100mg (8 tablets, currently out of stock), Cialis 10mg and 20mg (4 tablets) and generic tadalafil 5mg daily (28 tablets). Treated's prices include delivery and the online consultation.

- Price scraping can now read the strength and pack options on Rai's Pharmacy and Prime Med Pharmacy, which use a pharmacy shop system whose prices only show after you pick options. Eight prices were added from them: Viagra 25mg, 50mg and 100mg (4 tablets) at both pharmacies, plus Cialis 10mg and 20mg (4 tablets) at Rai's. The Viagra prices are marked for checking before publishing, because the pages say the product may come from a different manufacturer and the prices look like generic sildenafil prices.

- Price scraping can now read strength and pack-size dropdowns on pharmacy shops built with WooCommerce, such as Pharmaceutra, Razi Meds, Be Online and Newtons Chemist. It picks exactly the chosen strength and pack, and keeps branded and generic options apart when a shop lists both in the same dropdown.

- The Product variants page now has one "Scrape prices" button instead of separate "Scrape" and "Human scrape" buttons. For each pharmacy it tries the quick methods first, then automatically opens the page in a background browser. Only if a pharmacy shows a security check does a Chrome window open on the server computer, and the progress panel then asks you to complete the check. A check that isn't completed now skips just that pharmacy instead of stopping the whole scrape.

- Price scraping never opens a pharmacy's website in a browser after the site has said it doesn't allow automated visits.

- Well Pharmacy prices are now included. Well only lists per-pack prices as subscriptions, so these are saved as recurring prices rather than one-off purchases.

- Price scraping can now read prices from pharmacy shops built on the BigCommerce platform, such as Well, and only accepts a price when the page names the exact strength and pack size. If Well shows a security check, the scrape opens a Chrome window for you to complete it.

## 2026-09-24

- 74 new pharmacy prices were added across 18 pharmacies, covering all seven catalogue products, each checked by hand against the pharmacy's own website. They are all unpublished and waiting for staff review, and each is set up so future price scrapes go straight to its product page. Pharmacies whose websites block automated visits, or that don't show a clear price for an exact strength and pack size, were skipped.

- If one pharmacy page lists several strengths or pack sizes, each price you add by hand for that page now counts as its own confirmed match, rather than only the first one.

- Collecting a price for a single confirmed match (from the pharmacy's page) now only takes the price for that match's exact strength and pack size. On a page listing several pack sizes it will no longer pick up another pack's price; if the right one can't be told apart, it reports that instead of saving a guess.

- A price added by hand now counts as a confirmed product match for that pharmacy by default. Later price scrapes go straight to the product page you entered instead of searching the pharmacy's website again. The form's "Product page URL" field should be the exact page for that strength and pack. If the price didn't come from a web page (for example a phone quote), untick "Keep this price updated from the product page" and it is saved without a match, as before.

- When a scrape finds a newer price for a pharmacy that already has a price for that product, it now updates that same price instead of sometimes adding a second, duplicate one next to it. The old value stays in the price history.

- For pharmacies without a confirmed match, a scrape now first retries the page their last saved price came from, and only searches the whole website if that page no longer gives a price.

- On a product variant's prices page you can now add a price by hand: choose the pharmacy, enter the item price, delivery and other fees, and save. Each saved price also has edit and remove buttons, so a wrong or out-of-date price can be corrected right there. Changing a price adds an entry to that pharmacy's price history.

- Pharmacy discovery can now use Google AI and DeepSeek Web Search at the same time. Each pharmacy is assigned to only one of them, so the services cover separate pharmacies rather than repeating the same work; both results follow the same checks before appearing for review.

- On the Product variants page, scrape progress now appears in one panel above the table instead of a small box squeezed into each row's buttons. It shows which variant is being scraped, a larger live log and the final result, and stays visible after the scrape finishes until you close it. While one scrape is running, the scrape buttons on other rows are paused.

- Price scraping on the Product variants page now tries the quick routes first: it reads a pharmacy's own product feed and product pages directly, and only opens the browser (where you may need to complete a security check) when those don't give a price. Human scrape should now need your help on far fewer pharmacies.

- A price is taken from a pharmacy's product feed only when the feed names the exact strength and pack size and gives one clear price in pounds; anything unclear falls through to the product page instead.

- The scrape progress log now says where each saved price came from (product feed, page price data or the rendered page).

- Product detection now looks through every section of a pharmacy website's page listing, not just the top level. Pharmacies whose online shop pages sit in a separate section (common on WordPress and Shopify shops) are no longer missed.

- When the medicine filter promotes a pharmacy, the erectile-dysfunction product pages it found now appear in the Product matches review queue, ready for staff to pick the exact product.

- The Discovery candidates section of the admin Reviews page now has Pending, Promoted, Linked and Rejected tabs, so pharmacies that have already been promoted or rejected stay visible (with who reviewed them and when) instead of disappearing from the page.

## 2026-09-23

- The product variants page now shows a live, step-by-step progress panel while prices are being scraped ("Checking X...", "Saved £Y for X...", "Still waiting for verification..."), instead of a single spinner with no detail — for "Human scrape" especially, which can otherwise sit quietly for minutes while staff wait with no feedback.

- Human-assisted price collection now uses the Patchright browser engine with the saved, visible Chrome session, while keeping staff-controlled website verification and review-only price handling.

- Human product-listing checks now keep one maximized dedicated Chrome session open throughout the run, reuse the same page and saved browser profile, wait for each page to settle, and slow navigation between websites. Staff still complete any website verification themselves.

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



