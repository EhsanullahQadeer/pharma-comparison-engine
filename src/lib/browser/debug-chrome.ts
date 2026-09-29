import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

// The project's visible "debug Chrome": ordinary Google Chrome on the project's persistent, signed-in
// profile with remote debugging on, which Google AI / DeepSeek discovery and human-assisted price
// scraping attach to over CDP with their own patchright client. If an admin closes the
// window, the next "Run now" / scrape starts it again here instead of failing until someone reopens
// it by hand. Chrome is started as its own detached process (not by patchright), so it looks like a
// normal browser to sites and a person can complete security checks in it, and it survives dev-server
// restarts. The profile keeps Google/DeepSeek sign-ins and cleared checks between launches.
export const DEBUG_CHROME_CDP_URL = process.env.HUMAN_SCRAPE_CDP_URL ?? process.env.GOOGLE_AI_CDP_URL ?? "http://127.0.0.1:9222";
export const DEBUG_CHROME_PROFILE_DIR = process.env.HUMAN_SCRAPE_PROFILE_DIR ?? process.env.GOOGLE_AI_PROFILE_DIR ?? "tmp/google-ai-cdp-profile";

// 127.0.0.1 and localhost are tried both ways — some Windows setups only answer on one of them.
export function cdpUrlVariants(cdpUrl: string) {
  const urls = [cdpUrl];
  if (cdpUrl.includes("127.0.0.1")) urls.push(cdpUrl.replace("127.0.0.1", "localhost"));
  if (cdpUrl.includes("localhost")) urls.push(cdpUrl.replace("localhost", "127.0.0.1"));
  return [...new Set(urls)];
}

export async function isCdpReachable(cdpUrl: string) {
  try {
    const response = await fetch(new URL("/json/version", cdpUrl), { signal: AbortSignal.timeout(3_000) });
    return response.ok;
  } catch {
    return false;
  }
}

// Installed Google Chrome (HUMAN_SCRAPE_CHROME_PATH overrides).
export function chromeExecutable() {
  const candidates = [
    process.env.HUMAN_SCRAPE_CHROME_PATH,
    process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
    process.env["PROGRAMFILES(X86)"] && join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  ];
  return candidates.find((candidate): candidate is string => Boolean(candidate) && existsSync(candidate as string));
}

async function reachableUrl(cdpUrl: string) {
  for (const url of cdpUrlVariants(cdpUrl)) if (await isCdpReachable(url)) return url;
  return undefined;
}

// One launch at a time per port: concurrent callers (e.g. the Google AI and DeepSeek workers) share it.
const launches = new Map<string, Promise<string | undefined>>();

// Returns a reachable CDP URL for the debug Chrome, starting Chrome first if nothing is listening.
// undefined when Chrome isn't installed or didn't come up within 20s (callers report or fall back).
export async function ensureDebugChrome(cdpUrl = DEBUG_CHROME_CDP_URL, profileDir = DEBUG_CHROME_PROFILE_DIR): Promise<string | undefined> {
  const running = await reachableUrl(cdpUrl);
  if (running) return running;
  const port = new URL(cdpUrl).port || "9222";
  const pending = launches.get(port);
  if (pending) return pending;
  const launch = (async () => {
    const executable = chromeExecutable();
    if (!executable) return undefined;
    spawn(executable, [
      `--user-data-dir=${resolve(profileDir)}`,
      "--remote-debugging-address=127.0.0.1",
      `--remote-debugging-port=${port}`,
      "--no-first-run",
      "about:blank",
    ], { detached: true, stdio: "ignore" }).unref();
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      const url = await reachableUrl(cdpUrl);
      if (url) return url;
      await new Promise((settle) => setTimeout(settle, 500));
    }
    return undefined;
  })().finally(() => launches.delete(port));
  launches.set(port, launch);
  return launch;
}
