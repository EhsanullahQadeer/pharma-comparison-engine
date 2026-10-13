import type { ClickDevice } from "@/generated/prisma/client";
import type { ClickDetails } from "@/types/referrals";

// Anonymous marketing detail for an outbound click (M7). Pure, so the /go route stays thin and the
// rules are unit-tested. Only coarse labels leave this file: never the IP address or the raw user
// agent. Nothing here is — or may ever be — read by ranking code.

const MAX_CITY_LENGTH = 80;
const MAX_SOURCE_PATH_LENGTH = 300;

// First match wins, so the more specific names come before the engines they are built on.
const browserPatterns: [string, RegExp][] = [
  ["Edge", /edg(e|a|ios)?\//i],
  ["Opera", /opr\/|opera/i],
  ["Samsung Internet", /samsungbrowser/i],
  ["Firefox", /firefox|fxios/i],
  ["Chrome", /chrome|crios|chromium/i],
  ["Safari", /safari/i],
];

const osPatterns: [string, RegExp][] = [
  ["iOS", /iphone|ipad|ipod/i],
  ["Android", /android/i],
  ["Windows", /windows/i],
  ["ChromeOS", /cros/i],
  ["macOS", /mac os x|macintosh/i],
  ["Linux", /linux/i],
];

function firstMatch(patterns: [string, RegExp][], userAgent: string) {
  return patterns.find(([, pattern]) => pattern.test(userAgent))?.[0] ?? "Other";
}

function deviceType(userAgent: string): ClickDevice {
  // An Android tablet says "Android" without "Mobile".
  if (/ipad|tablet|playbook|silk/i.test(userAgent) || (/android/i.test(userAgent) && !/mobi/i.test(userAgent))) return "TABLET";
  return /mobi|iphone|ipod|android/i.test(userAgent) ? "MOBILE" : "DESKTOP";
}

export function clickDevice(userAgent: string): Pick<ClickDetails, "deviceType" | "browser" | "os"> {
  if (!userAgent) return { deviceType: null, browser: null, os: null };
  return { deviceType: deviceType(userAgent), browser: firstMatch(browserPatterns, userAgent), os: firstMatch(osPatterns, userAgent) };
}

function decoded(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// The approximate area the hosting platform worked out from the IP (Vercel's geolocation headers).
// Absent on a host that doesn't send them, and anything malformed is dropped rather than stored.
export function clickLocation(headers: Headers): Pick<ClickDetails, "country" | "region" | "city"> {
  const country = headers.get("x-vercel-ip-country")?.trim().toUpperCase() ?? "";
  const region = headers.get("x-vercel-ip-country-region")?.trim().toUpperCase() ?? "";
  const city = decoded(headers.get("x-vercel-ip-city")?.trim() ?? "").slice(0, MAX_CITY_LENGTH);
  return {
    country: /^[A-Z]{2}$/.test(country) ? country : null,
    region: /^[A-Z0-9]{1,3}$/.test(region) ? region : null,
    city: city || null,
  };
}

// The page of ours the "View" button was on, with its filters. Only our own pages are kept: a
// referrer from anywhere else is dropped, never stored.
export function clickSourcePath(referer: string | null, host: string | null) {
  if (!referer || !host) return null;
  try {
    const url = new URL(referer);
    return url.host === host ? `${url.pathname}${url.search}`.slice(0, MAX_SOURCE_PATH_LENGTH) : null;
  } catch {
    return null;
  }
}

export function clickDetails(headers: Headers): ClickDetails {
  return {
    ...clickLocation(headers),
    ...clickDevice(headers.get("user-agent") ?? ""),
    sourcePath: clickSourcePath(headers.get("referer"), headers.get("host")),
  };
}
