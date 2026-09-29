import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import { chromium } from "patchright";

const AI_MODE_URL = "https://www.google.com/ai";
const profileDir = process.env.GOOGLE_AI_PROFILE_DIR ?? "tmp/patchright-google-profile";
const browserChannel = process.env.GOOGLE_AI_BROWSER_CHANNEL ?? "chrome";

async function main() {
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: browserChannel,
    headless: false,
  });
  const page = await context.newPage();
  await page.goto(AI_MODE_URL, { waitUntil: "domcontentloaded" });

  output.write([
    "",
    `Opened Google AI Mode with local patchright profile: ${profileDir}`,
    `Browser channel: ${browserChannel}`,
    "Sign in manually in the browser window and complete Authenticator/2FA.",
    "When AI Mode shows the prompt box, come back here and press Enter to close the browser.",
    "",
  ].join("\n"));

  const rl = createInterface({ input, output });
  await rl.question("");
  rl.close();
  await context.close();
}

main().catch(error => {
  output.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
