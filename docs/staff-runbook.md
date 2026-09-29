# Staff runbook

How to handle the three situations staff will meet most often after launch: a listing that is
wrong, a pharmacy that has to come off the site, and a wrong price reported outside working hours.
Everything here is done in the admin area (sign in at `/admin/login`).

Items marked **[to agree]** are proposals that the business still needs to confirm.

## Who can do what

| Action | Who |
| --- | --- |
| Handle a correction report | Catalogue editor, content reviewer, administrator |
| Hide or show a single price | Catalogue editor, administrator |
| Take a pharmacy off the site temporarily, and put it back | Catalogue editor, administrator |
| Archive a pharmacy (permanent takedown) or bring it back | Administrator only |

Every one of these actions is recorded in the **Audit log** with your name and the time.

## Where reports arrive

- **Wrong price or wrong detail:** the public "Claim or correct a listing" page and the "Report a
  wrong price" link. These arrive in **Reviews → Corrections**.
- **General messages and pharmacy suggestions:** the **Inbox** page.

Nobody is notified when a report arrives: there is no email or phone alert. Someone has to check
Reviews → Corrections and the Inbox. **[to agree]** At least once each working day, and first
thing after a weekend or holiday.

## 1. Correct a listing

1. Open **Reviews → Corrections**. Pick the report and press **Claim**, so others can see you
   are handling it. Set its status to **In progress**.
2. Click the pharmacy name to open its page. Check the claim against the pharmacy's own website,
   not against the report alone.
3. Fix what is wrong:
   - **A price:** use **Collect price** / **Refresh price** on that product to read it again from
     the pharmacy's page, or edit the price by hand. A hand-entered price is the right choice
     when automatic reading keeps failing or the real price changed by more than five times
     (automatic checks refuse such changes as likely errors).
   - **Pharmacy details** (name, address, registration, website): use **Edit details** on the
     pharmacy page.
4. Set the report to **Resolved**. If the report was wrong (the site already showed the correct
   information), set it to **Rejected**.
5. If the reporter left an email address and it's a notable fix, reply to thank them. **[to agree]**
   Whether we reply, and with what wording.

Never change a price only because someone says it is wrong. Only change it once you've seen the
new price on the pharmacy's own website.

## 2. Take a pharmacy off the site

Use this when a pharmacy's registration can't be confirmed, its website has changed hands, it
has stopped selling ED treatment, or it's the subject of a serious complaint.

1. Open **Pharmacies** and the pharmacy's page.
2. Open **Change status** next to its status badge and choose **Move to Temporarily withheld**.
   Confirm when asked. The pharmacy and all its prices disappear from the public site at once.
3. Add a note of why in the correction (if there is one) or tell the administrator.
4. When the problem is fixed and checked, choose **Move to Published** to put it back.
5. **Archive** it only if it should never come back: administrators only.

Don't publish anything accusing the pharmacy of wrongdoing. Withholding a listing is a neutral
step while we check.

## 3. A wrong price reported outside working hours

The site is not staffed around the clock, and nothing we publish should promise that it is.

What protects visitors when nobody is around:
- Automatic price checks refuse impossible prices (£0, under 10p a tablet, or more than five
  times higher or lower than before). The previous price stays up instead.
- Any price not rechecked for 48 hours disappears from the public site on its own.
- The comparison says to confirm the final price at checkout.

What to do when you next pick it up:
1. Treat it as the first job of the day. Check the price on the pharmacy's own website.
2. If our price is wrong and you can't fix it straight away, **hide that price**: on the pharmacy
   page, press the eye button (**Unpublish price**) next to it. It leaves the public site at once;
   everything else stays up.
3. If many prices from one pharmacy are wrong, **withhold the whole pharmacy** (section 2).
4. Fix the price (section 1), publish it again with **Publish price**, and resolve the report.
5. If the same pharmacy keeps producing wrong prices, tell the developer: its page layout has
   probably changed and automatic reading needs fixing.

**[to agree]** Whether anyone is on call out of hours, and for what. Suggested rule: nobody is on
call; reports are handled from the next working morning, and anything affecting several
pharmacies at once (for example every price showing £0) is escalated to the developer
immediately using the contacts below.

## Escalation contacts

**[to agree]** Fill in before launch.

| For | Name | How to reach | When |
| --- | --- | --- | --- |
| Site down or showing wrong data across many pharmacies | | | |
| Price collection stopped (no new prices for 24 hours) | | | |
| Legal or regulatory complaint about a listing | | | |
| Data protection request or incident | | | |
| Server / hosting | | | |
