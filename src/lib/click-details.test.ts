import assert from "node:assert/strict";
import { test } from "node:test";

import { clickDetails, clickDevice, clickLocation, clickSourcePath } from "./click-details";

const chromeWindows = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const edgeWindows = `${chromeWindows} Edg/140.0.0.0`;
const safariIphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const safariIpad = "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const chromeAndroidPhone = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";
const chromeAndroidTablet = "Mozilla/5.0 (Linux; Android 15; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const samsungPhone = "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36";
const firefoxMac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:130.0) Gecko/20100101 Firefox/130.0";

test("device, browser and system are read as coarse labels", () => {
  assert.deepEqual(clickDevice(chromeWindows), { deviceType: "DESKTOP", browser: "Chrome", os: "Windows" });
  assert.deepEqual(clickDevice(edgeWindows), { deviceType: "DESKTOP", browser: "Edge", os: "Windows" });
  assert.deepEqual(clickDevice(safariIphone), { deviceType: "MOBILE", browser: "Safari", os: "iOS" });
  assert.deepEqual(clickDevice(safariIpad), { deviceType: "TABLET", browser: "Safari", os: "iOS" });
  assert.deepEqual(clickDevice(chromeAndroidPhone), { deviceType: "MOBILE", browser: "Chrome", os: "Android" });
  assert.deepEqual(clickDevice(chromeAndroidTablet), { deviceType: "TABLET", browser: "Chrome", os: "Android" });
  assert.deepEqual(clickDevice(samsungPhone), { deviceType: "MOBILE", browser: "Samsung Internet", os: "Android" });
  assert.deepEqual(clickDevice(firefoxMac), { deviceType: "DESKTOP", browser: "Firefox", os: "macOS" });
});

test("an unknown or missing user agent is not guessed at", () => {
  assert.deepEqual(clickDevice(""), { deviceType: null, browser: null, os: null });
  assert.deepEqual(clickDevice("SomethingNew/1.0"), { deviceType: "DESKTOP", browser: "Other", os: "Other" });
});

test("the area comes from the host's headers, and junk is dropped", () => {
  const headers = new Headers({ "x-vercel-ip-country": "gb", "x-vercel-ip-country-region": "ENG", "x-vercel-ip-city": "Newcastle%20upon%20Tyne" });
  assert.deepEqual(clickLocation(headers), { country: "GB", region: "ENG", city: "Newcastle upon Tyne" });
  assert.deepEqual(clickLocation(new Headers()), { country: null, region: null, city: null });
  assert.deepEqual(clickLocation(new Headers({ "x-vercel-ip-country": "United Kingdom", "x-vercel-ip-country-region": "not a code", "x-vercel-ip-city": "%E0%A4%A" })), { country: null, region: null, city: "%E0%A4%A" });
  assert.equal(clickLocation(new Headers({ "x-vercel-ip-city": "x".repeat(200) })).city?.length, 80);
});

test("only a page on our own site is kept as the page clicked from", () => {
  assert.equal(clickSourcePath("https://example.test/ed/compare?medicine=sildenafil&sort=total", "example.test"), "/ed/compare?medicine=sildenafil&sort=total");
  assert.equal(clickSourcePath("https://www.google.com/search?q=viagra", "example.test"), null);
  assert.equal(clickSourcePath("not a url", "example.test"), null);
  assert.equal(clickSourcePath(null, "example.test"), null);
  assert.equal(clickSourcePath("https://example.test/ed/compare", null), null);
  assert.equal(clickSourcePath(`https://example.test/ed/compare?x=${"y".repeat(500)}`, "example.test")?.length, 300);
});

test("the IP address and raw user agent never appear in what is stored", () => {
  const headers = new Headers({ "user-agent": chromeWindows, "x-forwarded-for": "203.0.113.7", "x-real-ip": "203.0.113.7", host: "example.test", referer: "https://example.test/ed/pharmacies/dr-fox" });
  const details = clickDetails(headers);
  assert.deepEqual(details, { country: null, region: null, city: null, deviceType: "DESKTOP", browser: "Chrome", os: "Windows", sourcePath: "/ed/pharmacies/dr-fox" });
  assert.equal(JSON.stringify(details).includes("203.0.113.7"), false);
  assert.equal(JSON.stringify(details).includes("Mozilla"), false);
});
