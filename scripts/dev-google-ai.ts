import { spawn } from "node:child_process";
import { env, exit } from "node:process";

import { chromium, type BrowserContext } from "patchright";

const cdpUrl = env.GOOGLE_AI_CDP_URL ?? "http://127.0.0.1:9222";
const profileDir = env.GOOGLE_AI_PROFILE_DIR ?? "tmp/google-ai-cdp-profile";
const browserChannel = env.GOOGLE_AI_BROWSER_CHANNEL ?? "chrome";
const aiModeUrl = "https://www.google.com/ai";

async function isCdpReachable() {
  try {
    const response = await fetch(new URL("/json/version", cdpUrl));
    return response.ok;
  } catch {
    return false;
  }
}

async function openChromeDebugSession(): Promise<BrowserContext | undefined> {
  if (await isCdpReachable()) {
    process.stdout.write(`Google AI Chrome debugging session already reachable at ${cdpUrl}\n`);
    return undefined;
  }

  process.stdout.write(`Opening Chrome debugging session for Google AI at ${cdpUrl}\n`);
  const context = await chromium.launchPersistentContext(profileDir, {
    args: ["--remote-debugging-address=127.0.0.1", "--remote-debugging-port=9222"],
    channel: browserChannel,
    headless: false,
    viewport: null,
  });
  const page = await context.newPage();
  await page.goto(aiModeUrl, { waitUntil: "domcontentloaded" }).catch(error => {
    process.stderr.write(`Chrome opened, but Google AI Mode did not load yet: ${error instanceof Error ? error.message : String(error)}\n`);
    process.stderr.write(`Keep the Chrome window open and manually open ${aiModeUrl} after network/DNS is available.\n`);
  });
  process.stdout.write(`Chrome opened with profile ${profileDir}. Sign in to Google AI Mode there if needed, and keep it open while dev runs.\n`);
  return context;
}

async function main() {
  const browserContext = await openChromeDebugSession();
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev"], {
    env: {
      ...env,
      GOOGLE_AI_CDP_URL: cdpUrl,
    },
    stdio: "inherit",
  });

  child.on("exit", async code => {
    await browserContext?.close().catch(() => undefined);
    exit(code ?? 0);
  });
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  exit(1);
});
