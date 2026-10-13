// Decides when a failed automatic price check is worth a second try in the visible Chrome window,
// where a person can complete a security check. Works on the failure message because that is all
// a staff action hands back to the browser.

// Failures the visible window can't change: a robots refusal is final, an impossible price would be
// read and refused again, and the rest are refused before any page is opened.
const FINAL_FAILURE = /robots rules|Rejected impossible scraped price|already has a price for this product|Confirm this match|not authorized|Product match not found/i;

export function worthVisibleBrowserRetry(message: string) {
  return !FINAL_FAILURE.test(message);
}

// The visible window itself got nowhere (nobody completed the check, or the site keeps re-checking):
// the pharmacy's other pages would wait just as long, so they are not sent there in the same run.
const VISIBLE_BROWSER_GAVE_UP = /not completed within five minutes|keeps returning to Cloudflare|Verification browser was closed|debugging session is not reachable/i;

export function visibleBrowserGaveUp(message: string) {
  return VISIBLE_BROWSER_GAVE_UP.test(message);
}
