import type { Page } from "patchright";

const transientNetworkErrorPattern = /net::ERR_(NETWORK_CHANGED|INTERNET_DISCONNECTED|CONNECTION_RESET|CONNECTION_CLOSED|CONNECTION_REFUSED|CONNECTION_TIMED_OUT|NAME_NOT_RESOLVED|ADDRESS_UNREACHABLE|SOCKET_NOT_CONNECTED|TIMED_OUT|EMPTY_RESPONSE)/i;

export async function gotoWithNetworkRetry(
  page: Page,
  url: string,
  options: { waitUntil: "domcontentloaded" | "commit"; timeout: number },
  maxWaitMs = 10 * 60_000,
) {
  const deadline = Date.now() + maxWaitMs;
  for (;;) {
    try {
      await page.goto(url, options);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!transientNetworkErrorPattern.test(message) || Date.now() >= deadline) throw error;
      process.stdout.write(`Network error reaching ${url} (${message.split("\n")[0]}); waiting for the connection to come back, then retrying...\n`);
      await page.waitForTimeout(5_000);
    }
  }
}
