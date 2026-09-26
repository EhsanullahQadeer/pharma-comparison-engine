import { headers } from "next/headers";

// Lightweight protection for the public forms — no third-party CAPTCHA, no stored IPs:
// - a hidden honeypot field humans never fill;
// - a minimum time between the form rendering and submitting (bots post instantly);
// - a per-IP rate limit held in memory. The app runs as a single web process on the VPS
//   (milestone 05), so an in-process window is enough; it resets on restart, which is acceptable.
const MIN_FILL_MS = 3_000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

export type SpamVerdict = "ok" | "silent-drop" | "rate-limited";

async function clientKey() {
  const list = await headers();
  return list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || "unknown";
}

export async function checkSubmission({ nickname, startedAt }: { nickname?: string; startedAt: number }): Promise<SpamVerdict> {
  // Bots get a normal-looking success so they don't adapt; nothing is saved.
  if (nickname || Date.now() - startedAt < MIN_FILL_MS) return "silent-drop";

  const key = await clientKey();
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) return "rate-limited";
  recent.set(key, [...hits, now]);
  return "ok";
}
