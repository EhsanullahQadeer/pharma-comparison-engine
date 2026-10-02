import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { stdout } from "node:process";

import { chromium, type BrowserContext, type Page } from "patchright";
import { gotoWithNetworkRetry } from "./lib/browser-navigation";
import { decisionJsonInPage, normalizeChatgptDisplayText } from "./lib/chatgpt-response";
import type { ReviewedDecision } from "./lib/distance-selling-classification";

type Candidate = {
  gphcNumber: string;
  tradingName: string;
  address: { postcode: string | null };
};

type GoogleRecord = {
  sequence: number;
  status: string;
  kind?: "INITIAL" | "FOLLOW_UP";
  prompt?: string;
  candidate: Candidate;
  google?: { pageUrl: string; responseText: string; links: Array<{ href: string; text: string }> };
};

type DecisionStatus = "ACCEPTED" | "REJECTED" | "NEEDS_REVIEW";
type ReviewStatus = "REVIEWED" | "LIMIT_REACHED" | "MANUAL_REVIEW" | "ERROR";
type RefinedDecision = ReviewedDecision;

type RefinedRecord = {
  schemaVersion: 1;
  sequence: number;
  status: ReviewStatus;
  sourceGoogleSequence: number;
  requestedAt: string;
  receivedAt: string;
  decision?: RefinedDecision;
  error?: string;
  chatUrl?: string;
};

const defaultInput = "tmp/distance-selling-google-ai-raw-results.jsonl";
const defaultOutput = "tmp/distance-selling-chatgpt-refined-results.jsonl";
const defaultProfile = "tmp/price-collection-human-browser";
const chatgptUrl = "https://chatgpt.com/";
const manualCheckPattern = /verify you are human|captcha|security check|unusual activity|checking your browser|complete the security check/i;
const limitPattern = /usage limit|rate limit|too many requests|try again later|limit reached/i;

function optionValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function positiveNumber(name: string, fallback: number) {
  const value = optionValue(name);
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive whole number.`);
  return parsed;
}

function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split(/\r?\n/).flatMap((line, index) => {
    if (!line.trim()) return [];
    try {
      return [JSON.parse(line) as T];
    } catch {
      throw new Error(`Invalid JSONL in ${path} at line ${index + 1}.`);
    }
  });
}

function appendJsonl(path: string, record: RefinedRecord) {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(record)}\n`, "utf8");
}

function researchForReview(record: GoogleRecord) {
  const directLinks = (record.google?.links ?? []).filter(link => {
    try {
      const host = new URL(link.href).hostname;
      return host !== "google.com" && !host.endsWith(".google.com") && !host.endsWith(".google.com.pk");
    } catch {
      return false;
    }
  });
  const rawText = record.google?.responseText ?? "";
  const promptIndex = record.prompt ? rawText.lastIndexOf(record.prompt) : -1;
  const googleResponseText = promptIndex >= 0 ? rawText.slice(promptIndex + record.prompt!.length).trim() : rawText;
  return {
    gphcNumber: record.candidate.gphcNumber,
    pharmacyName: record.candidate.tradingName,
    postcode: record.candidate.address.postcode,
    googleResponseText,
    nonGoogleLinks: directLinks.slice(0, 20),
  };
}

function fullResearchForReview(record: GoogleRecord, source: GoogleRecord[]): GoogleRecord {
  if (record.kind !== "FOLLOW_UP") return record;
  const initial = source.findLast(item => item.kind !== "FOLLOW_UP" && item.status === "RECEIVED" &&
    item.candidate.gphcNumber === record.candidate.gphcNumber && item.sequence < record.sequence);
  if (!initial?.google) return record;
  return {
    ...record,
    google: {
      pageUrl: record.google?.pageUrl ?? "",
      responseText: JSON.stringify({ initialGoogleResearch: initial.google.responseText, followUpGoogleResearch: record.google?.responseText ?? "" }),
      links: [...(initial.google.links ?? []), ...(record.google?.links ?? [])],
    },
  };
}

function reviewPrompt(record: GoogleRecord) {
  return [
    "Return one JSON object only. You are an evidence reviewer for a UK pharmacy directory.",
    "Review the supplied Google research first. If it is inconclusive, use your available web research/search to investigate the named GPhC premises and its official website more deeply. Do not infer, repair, or invent URLs. A bare domain name is not a URL: do not add https:// to it.",
    "If your own research finds any new official URL absent from the supplied Google evidence, return NEEDS_REVIEW and put an exact-URL corroboration request in followUpGoogleQuery. Do not mark it ACCEPTED or use that URL to assert a positive filter yet.",
    "ACCEPTED requires a direct, non-Google official URL to a public product, medicine, treatment, shop, or ED listing.",
    "REJECTED requires clear official evidence that the site is directory-only, consultation-only, or prescription-request-only without public listings. A Google answer merely failing to find a listing is not enough to prove absence.",
    "NEEDS_REVIEW applies when official identity or a direct listing URL cannot be verified and exclusion is not established. Ask one narrowly targeted Google follow-up.",
    "Return classification labels based on evidence, independently of the overall verdict. publicListing is DIRECT_URL_REPORTED only with an official direct listing URL, SHOP_CLAIM_NO_DIRECT_URL only when an official source claims a shop but no direct item/listing URL is confirmed, otherwise NO_DIRECT_URL (which means unknown, not proof of no products). erectileDysfunction is DIRECT_LISTING_REPORTED only for an explicit official ED product/treatment listing URL, MENTIONED_NO_DIRECT_URL for a sourced ED mention without such a URL, otherwise NOT_CONFIRMED. listingBreadth describes the number of distinct products or treatments on a confirmed direct public listing: SINGLE_TREATMENT_EXAMPLE, MULTIPLE_TREATMENT_EXAMPLES, or UNKNOWN. Do not infer breadth from an advertised item count. treatmentAreas may contain only ERECTILE_DYSFUNCTION, WEIGHT_MANAGEMENT, HAIR_LOSS, MIGRAINE, TRAVEL_HEALTH, ALLERGY, WOMENS_HEALTH, COLD_SORES when linked to a product/treatment on a confirmed direct public listing; a generic service mention such as 'travel health and OTC treatments' is not enough. listedExamples contains concise products/treatments on that confirmed listing only, not guessed inventory. If publicListing is not DIRECT_URL_REPORTED, set listingBreadth=UNKNOWN, treatmentAreas=[], listedExamples=[].",
    "Also return versioned commerce filters: version=2; purchaseJourney is DIRECT_CHECKOUT (public checkout for listed items), CONSULTATION_FIRST (clinical assessment before purchase), PRESCRIPTION_REQUEST_ONLY (request or nominate prescriptions without a public item catalogue), or UNKNOWN; fulfilmentMethods is an array of HOME_DELIVERY, CLICK_AND_COLLECT, LOCAL_COURIER; deliveryCoverage is UK_WIDE, REGIONAL, LOCAL, or UNKNOWN (select only an explicitly stated coverage); medicineSupply is an array of NHS_PRESCRIPTIONS, PRIVATE_PRESCRIPTIONS, OVER_THE_COUNTER; orderChannels is an array of WEBSITE, APP, PHONE (only if ordering through that channel is evidenced, not merely contact or an informational website); priceVisibility is PUBLIC_PRICE_SHOWN or NOT_CONFIRMED. Use an empty array or UNKNOWN/NOT_CONFIRMED when official evidence is absent. A pharmacy being registered as Internet is not itself proof of checkout, delivery range, medicine supply, or prices.",
    "Add classification.evidenceUrlsByLabel: an object mapping every positive publicListing, erectileDysfunction, treatmentAreas, purchaseJourney, fulfilmentMethods, deliveryCoverage, medicineSupply, orderChannels, or priceVisibility value to one or more direct official website URLs whose page actually states or lists that feature. Use the field name as the key for scalar values; for arrays use the exact enum value as the key (for example HOME_DELIVERY or NHS_PRESCRIPTIONS). A homepage URL alone is not evidence of a feature unless that page actually states it. Do not use a Google search URL, redirect, directory, or the original prompt as evidence. If a positive label has no supporting official URL, leave that label unconfirmed. The direct URLs must also appear in evidenceUrls.",
    "For NEEDS_REVIEW, provide one narrowly worded followUpGoogleQuery, otherwise null. Do not invent a phone or delivery terms: use null unless the cited source actually states them. confidence must be HIGH, MEDIUM, or LOW.",
    "Use exactly these top-level fields: gphcNumber, pharmacyName, status, officialWebsite, officialProductUrl, listedProductOrTreatment, phone, deliveryOptions, evidenceUrls, reason, confidence, followUpGoogleQuery, classification. classification must contain exactly version, publicListing, erectileDysfunction, listingBreadth, treatmentAreas, listedExamples, purchaseJourney, fulfilmentMethods, deliveryCoverage, medicineSupply, orderChannels, priceVisibility, evidenceUrlsByLabel. Every nullable field must be a string or null; deliveryOptions is one string or null; evidenceUrls and plural filter fields are arrays of strings. No prose outside the JSON object.",
    'Classification shape when nothing is confirmed: {"version":2,"publicListing":"NO_DIRECT_URL","erectileDysfunction":"NOT_CONFIRMED","listingBreadth":"UNKNOWN","treatmentAreas":[],"listedExamples":[],"purchaseJourney":"UNKNOWN","fulfilmentMethods":[],"deliveryCoverage":"UNKNOWN","medicineSupply":[],"orderChannels":[],"priceVisibility":"NOT_CONFIRMED","evidenceUrlsByLabel":{}}. Replace unknowns only where the cited official page supports the label.',
    JSON.stringify(researchForReview(record)),
  ].join("\n");
}

function explicitEvidenceUrls(record: GoogleRecord) {
  const links = (record.google?.links ?? []).map(link => link.href).filter(href => {
    try {
      const host = new URL(href).hostname;
      return host !== "google.com" && !host.endsWith(".google.com") && !host.endsWith(".google.com.pk");
    } catch {
      return false;
    }
  });
  const responseText = record.google?.responseText ?? "";
  let textUrls: string[];
  try {
    const parsed = JSON.parse(responseText) as unknown;
    const strings: string[] = [];
    const collect = (value: unknown): void => {
      if (typeof value === "string") {
        strings.push(value);
      } else if (Array.isArray(value)) {
        value.forEach(collect);
      } else if (value && typeof value === "object") {
        Object.values(value).forEach(collect);
      }
    };
    collect(parsed);
    textUrls = strings.flatMap(value => value.match(/https?:\/\/[^\s"'\\\]}>,]+/g) ?? []);
  } catch {
    textUrls = responseText.match(/https?:\/\/[^\s"'\\\]}>,]+/g) ?? [];
  }
  return new Set([...links, ...textUrls]);
}

function parseDecision(record: GoogleRecord, response: string): RefinedDecision {
  const json = response.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? response;
  const decision = JSON.parse(json.trim()) as RefinedDecision;
  const allowed: DecisionStatus[] = ["ACCEPTED", "REJECTED", "NEEDS_REVIEW"];
  if (!allowed.includes(decision.status) || !decision.gphcNumber || !decision.pharmacyName || !decision.reason) {
    throw new Error("ChatGPT returned JSON but not the required refined decision.");
  }
  if (decision.gphcNumber !== record.candidate.gphcNumber) throw new Error("ChatGPT returned the wrong GPhC number.");
  decision.confidence = decision.confidence?.toUpperCase() as RefinedDecision["confidence"];
  if (!["HIGH", "MEDIUM", "LOW"].includes(decision.confidence)) throw new Error("ChatGPT returned invalid confidence.");
  const nullableTextFields = [decision.officialWebsite, decision.officialProductUrl, decision.listedProductOrTreatment, decision.phone, decision.deliveryOptions, decision.followUpGoogleQuery];
  if (nullableTextFields.some(value => value !== null && typeof value !== "string") || !Array.isArray(decision.evidenceUrls) || decision.evidenceUrls.some(url => typeof url !== "string")) {
    throw new Error("ChatGPT returned a refined decision with invalid field types.");
  }
  const classification = decision.classification;
  const publicLabels = ["DIRECT_URL_REPORTED", "SHOP_CLAIM_NO_DIRECT_URL", "NO_DIRECT_URL"];
  const edLabels = ["DIRECT_LISTING_REPORTED", "MENTIONED_NO_DIRECT_URL", "NOT_CONFIRMED"];
  const breadthLabels = ["SINGLE_TREATMENT_EXAMPLE", "MULTIPLE_TREATMENT_EXAMPLES", "UNKNOWN"];
  const areaLabels = ["ERECTILE_DYSFUNCTION", "WEIGHT_MANAGEMENT", "HAIR_LOSS", "MIGRAINE", "TRAVEL_HEALTH", "ALLERGY", "WOMENS_HEALTH", "COLD_SORES"];
  if (!classification || !publicLabels.includes(classification.publicListing) || !edLabels.includes(classification.erectileDysfunction) ||
    !breadthLabels.includes(classification.listingBreadth) || !Array.isArray(classification.treatmentAreas) ||
    classification.treatmentAreas.some(area => !areaLabels.includes(area)) || !Array.isArray(classification.listedExamples) ||
    classification.listedExamples.some(example => typeof example !== "string") || !classification.evidenceUrlsByLabel ||
    typeof classification.evidenceUrlsByLabel !== "object" || Array.isArray(classification.evidenceUrlsByLabel)) {
    throw new Error("ChatGPT returned invalid or missing classification labels.");
  }
  const purchaseJourneys = ["DIRECT_CHECKOUT", "CONSULTATION_FIRST", "PRESCRIPTION_REQUEST_ONLY", "UNKNOWN"];
  const fulfilmentMethods = ["HOME_DELIVERY", "CLICK_AND_COLLECT", "LOCAL_COURIER"];
  const deliveryCoverages = ["UK_WIDE", "REGIONAL", "LOCAL", "UNKNOWN"];
  const medicineSupplies = ["NHS_PRESCRIPTIONS", "PRIVATE_PRESCRIPTIONS", "OVER_THE_COUNTER"];
  const orderChannels = ["WEBSITE", "APP", "PHONE"];
  const priceVisibilities = ["PUBLIC_PRICE_SHOWN", "NOT_CONFIRMED"];
  if (classification.version !== 2 || !purchaseJourneys.includes(classification.purchaseJourney ?? "") ||
    !deliveryCoverages.includes(classification.deliveryCoverage ?? "") || !priceVisibilities.includes(classification.priceVisibility ?? "") ||
    !Array.isArray(classification.fulfilmentMethods) || classification.fulfilmentMethods.some(value => !fulfilmentMethods.includes(value)) ||
    !Array.isArray(classification.medicineSupply) || classification.medicineSupply.some(value => !medicineSupplies.includes(value)) ||
    !Array.isArray(classification.orderChannels) || classification.orderChannels.some(value => !orderChannels.includes(value))) {
    throw new Error("ChatGPT returned invalid or missing version-2 commerce filters.");
  }
  if (classification.publicListing === "DIRECT_URL_REPORTED" && (!decision.officialProductUrl || decision.status !== "ACCEPTED") ||
    decision.status === "ACCEPTED" && (classification.publicListing !== "DIRECT_URL_REPORTED" || !decision.officialProductUrl)) {
    decision.status = "NEEDS_REVIEW";
    decision.reason = `${decision.reason} The direct-listing label and accepted listing URL were inconsistent; no listing was accepted.`;
    decision.officialProductUrl = null;
    classification.publicListing = "NO_DIRECT_URL";
    classification.erectileDysfunction = "NOT_CONFIRMED";
    classification.listingBreadth = "UNKNOWN";
    classification.treatmentAreas = [];
    classification.listedExamples = [];
    delete classification.evidenceUrlsByLabel.publicListing;
    delete classification.evidenceUrlsByLabel.erectileDysfunction;
  }
  if (classification.publicListing !== "DIRECT_URL_REPORTED") {
    classification.listingBreadth = "UNKNOWN";
    classification.listedExamples = [];
    for (const area of classification.treatmentAreas) delete classification.evidenceUrlsByLabel[area];
    classification.treatmentAreas = [];
  }
  const positiveLabels = [
    ...(classification.publicListing !== "NO_DIRECT_URL" ? ["publicListing"] : []),
    ...(classification.erectileDysfunction !== "NOT_CONFIRMED" ? ["erectileDysfunction"] : []),
    ...classification.treatmentAreas,
    ...(classification.purchaseJourney !== "UNKNOWN" ? ["purchaseJourney"] : []),
    ...classification.fulfilmentMethods,
    ...(classification.deliveryCoverage !== "UNKNOWN" ? ["deliveryCoverage"] : []),
    ...classification.medicineSupply,
    ...classification.orderChannels,
    ...(classification.priceVisibility === "PUBLIC_PRICE_SHOWN" ? ["priceVisibility"] : []),
  ];
  const unresolvedEvidence = (problem: string, url?: string): RefinedDecision => {
    decision.status = "NEEDS_REVIEW";
    decision.reason = `${decision.reason} ${problem} No listing or filter based on that evidence was accepted.`;
    decision.followUpGoogleQuery ??= url && /^https?:\/\/\S+$/.test(url)
      ? `Verify whether ${url} belongs to ${record.candidate.tradingName}, GPhC ${record.candidate.gphcNumber}, and what the page explicitly supports. Cite the direct page and registration identity.`
      : `Find the official website and direct product listing for ${record.candidate.tradingName}, GPhC ${record.candidate.gphcNumber}; cite exact URLs.`;
    decision.officialProductUrl = null;
    decision.listedProductOrTreatment = null;
    decision.classification = {
      version: 2, publicListing: "NO_DIRECT_URL", erectileDysfunction: "NOT_CONFIRMED", listingBreadth: "UNKNOWN",
      treatmentAreas: [], listedExamples: [], purchaseJourney: "UNKNOWN", fulfilmentMethods: [],
      deliveryCoverage: "UNKNOWN", medicineSupply: [], orderChannels: [], priceVisibility: "NOT_CONFIRMED",
      evidenceUrlsByLabel: {},
    };
    return decision;
  };
  for (const label of positiveLabels) {
    const urls = classification.evidenceUrlsByLabel[label];
    if (!Array.isArray(urls) || !urls.length || urls.some(url => typeof url !== "string" || !decision.evidenceUrls.includes(url))) {
      return unresolvedEvidence(`ChatGPT label ${label} lacks a direct source URL in evidenceUrls.`, urls?.[0]);
    }
  }
  if (positiveLabels.length) {
    if (!decision.officialWebsite || !URL.canParse(decision.officialWebsite) || !/^https?:\/\/\S+$/.test(decision.officialWebsite)) {
      return unresolvedEvidence("Positive classification labels require a complete official website URL.", decision.officialWebsite ?? undefined);
    }
    const officialHost = new URL(decision.officialWebsite).hostname.replace(/^www\./, "");
    for (const label of positiveLabels) {
      for (const url of classification.evidenceUrlsByLabel[label]) {
        if (!URL.canParse(url) || !/^https?:\/\/\S+$/.test(url)) return unresolvedEvidence(`ChatGPT label ${label} has an invalid source URL.`, url);
        const source = new URL(url);
        const sourceHost = source.hostname.replace(/^www\./, "");
        if (!/^https?:$/.test(source.protocol) || sourceHost !== officialHost && !sourceHost.endsWith(`.${officialHost}`)) {
          return unresolvedEvidence(`ChatGPT label ${label} uses evidence outside the official website.`, url);
        }
      }
    }
  }
  if (classification.publicListing === "DIRECT_URL_REPORTED" &&
    !classification.evidenceUrlsByLabel.publicListing.includes(decision.officialProductUrl!)) {
    throw new Error("Direct-listing label must cite the accepted official product URL.");
  }
  if (classification.erectileDysfunction === "DIRECT_LISTING_REPORTED" && classification.publicListing !== "DIRECT_URL_REPORTED") {
    throw new Error("Direct ED listing requires a direct official listing.");
  }
  if (classification.erectileDysfunction === "DIRECT_LISTING_REPORTED" &&
    !classification.evidenceUrlsByLabel.erectileDysfunction.includes(decision.officialProductUrl!)) {
    throw new Error("Direct ED listing must cite the accepted official product URL.");
  }
  if (classification.listingBreadth === "SINGLE_TREATMENT_EXAMPLE" && classification.listedExamples.length !== 1 ||
    classification.listingBreadth === "MULTIPLE_TREATMENT_EXAMPLES" && classification.listedExamples.length < 2 ||
    classification.listingBreadth === "UNKNOWN" && classification.listedExamples.length > 0) {
    throw new Error("Listing breadth does not match the number of sourced examples.");
  }
  if (decision.status === "ACCEPTED" && !decision.officialProductUrl) {
    throw new Error("ChatGPT attempted to accept a pharmacy without a direct official product URL.");
  }
  const suppliedUrls = explicitEvidenceUrls(record);
  const decisionUrls = [decision.officialProductUrl, ...(classification.evidenceUrlsByLabel.publicListing ?? []),
    ...Object.values(classification.evidenceUrlsByLabel).flat(), ...decision.evidenceUrls, decision.officialWebsite]
    .filter((url): url is string => Boolean(url));
  const unsupportedUrl = decisionUrls.find(url => !suppliedUrls.has(url));
  if (unsupportedUrl) {
    if (!URL.canParse(unsupportedUrl) || !/^https?:\/\/\S+$/.test(unsupportedUrl)) return unresolvedEvidence("ChatGPT returned an invalid research URL.");
    decision.status = "NEEDS_REVIEW";
    decision.followUpGoogleQuery = `Verify whether ${unsupportedUrl} is an official page for ${record.candidate.tradingName}, GPhC ${record.candidate.gphcNumber}, and what it explicitly supports (listing, ordering, delivery, supply, or prices). Cite the direct page and registration identity.`;
    decision.reason = `${decision.reason} ChatGPT's newly found URL needs corroboration from Google before acceptance.`;
    decision.officialWebsite = suppliedUrls.has(decision.officialWebsite ?? "") ? decision.officialWebsite : null;
    decision.officialProductUrl = null;
    decision.evidenceUrls = decision.evidenceUrls.filter(url => suppliedUrls.has(url));
    decision.classification = {
      version: 2, publicListing: "NO_DIRECT_URL", erectileDysfunction: "NOT_CONFIRMED", listingBreadth: "UNKNOWN",
      treatmentAreas: [], listedExamples: [], purchaseJourney: "UNKNOWN", fulfilmentMethods: [],
      deliveryCoverage: "UNKNOWN", medicineSupply: [], orderChannels: [], priceVisibility: "NOT_CONFIRMED",
      evidenceUrlsByLabel: {},
    };
  }
  if (decision.status === "ACCEPTED" && !decision.evidenceUrls.includes(decision.officialProductUrl!)) {
    throw new Error("An accepted listing URL must also appear in evidenceUrls.");
  }
  if (decision.status === "ACCEPTED") {
    if (!decision.officialWebsite || !decision.listedProductOrTreatment) {
      throw new Error("An accepted pharmacy needs an official website and a listed product or treatment.");
    }
    const website = new URL(decision.officialWebsite);
    const listing = new URL(decision.officialProductUrl!);
    const officialHost = website.hostname.replace(/^www\./, "");
    const listingHost = listing.hostname.replace(/^www\./, "");
    if (!/^https?:$/.test(website.protocol) || !/^https?:$/.test(listing.protocol) ||
      (listingHost !== officialHost && !listingHost.endsWith(`.${officialHost}`))) {
      return unresolvedEvidence("The accepted product URL does not belong to the official pharmacy website.", decision.officialProductUrl ?? undefined);
    }
  }
  return decision;
}

async function waitForManualClearance(page: Page) {
  const deadline = Date.now() + 5 * 60_000;
  while (Date.now() < deadline) {
    const text = await page.locator("body").innerText();
    if (limitPattern.test(text)) throw new Error("CHATGPT_LIMIT_REACHED");
    const loggedOut = await page.getByRole("button", { name: "Log in", exact: true }).count() > 0;
    if (!manualCheckPattern.test(text) && !loggedOut) return;
    stdout.write("ChatGPT needs manual sign-in or verification in the open Patchright browser. This run will wait up to five minutes.\n");
    await page.waitForTimeout(2_000);
  }
  throw new Error("ChatGPT sign-in or verification was not completed within five minutes.");
}

async function sendPrompt(page: Page, prompt: string) {
  const input = page.locator('textarea:visible, [contenteditable="true"][role="textbox"]:visible, [contenteditable="true"]:visible').first();
  await input.waitFor({ state: "visible", timeout: 30_000 });
  await input.fill(prompt);
  const sendButton = page.locator('button[data-testid="send-button"]:visible, button[aria-label*="Send" i]:visible').last();
  await sendButton.waitFor({ state: "visible", timeout: 15_000 });
  await sendButton.click();
}

async function latestAssistantText(page: Page) {
  const messages = page.locator('[data-message-author-role="assistant"]');
  const count = await messages.count();
  if (!count) return "";
  return normalizeChatgptDisplayText((await messages.nth(count - 1).innerText()).trim());
}

function activeChatgptPage(context: BrowserContext, fallback: Page) {
  if (!fallback.isClosed()) return fallback;
  const replacement = context.pages().reverse().find(candidate => !candidate.isClosed() && candidate.url().includes("chatgpt.com"));
  if (!replacement) throw new Error("ChatGPT closed the active review tab before returning a response.");
  stdout.write("ChatGPT replaced the review tab; continuing in the active ChatGPT tab.\n");
  return replacement;
}

async function signInDiagnostics(context: BrowserContext, page: Page) {
  const loginVisible = await page.getByRole("button", { name: /^(Log in|Sign up)$/i }).first().isVisible().catch(() => false) ||
    await page.getByRole("link", { name: /^(Log in|Sign up)$/i }).first().isVisible().catch(() => false);
  // The sidebar may render hidden duplicate labels before its visible New chat entry.
  const visiblePageText = await page.locator("body").innerText().catch(() => "");
  const newChatVisible = /(?:^|\n)\s*New chat\s*(?:\n|$)/i.test(visiblePageText);
  const composerVisible = await page.locator('textarea:visible, [contenteditable="true"][role="textbox"]:visible, [contenteditable="true"]:visible').first().isVisible().catch(() => false);
  const cookies = await context.cookies(chatgptUrl);
  const authCookieNames = cookies.filter(cookie => /session|auth/i.test(cookie.name)).map(cookie => cookie.name);
  return { loginVisible, newChatVisible, composerVisible, hasAuthCookie: authCookieNames.length > 0, authCookieNames, totalCookies: cookies.length };
}

async function hasSignedInChatgptUi(context: BrowserContext, page: Page) {
  const diagnostics = await signInDiagnostics(context, page);
  return !diagnostics.loginVisible && diagnostics.newChatVisible && diagnostics.composerVisible;
}

async function waitForSignedInChatgptUi(context: BrowserContext, page: Page, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await hasSignedInChatgptUi(context, page)) return true;
    await page.waitForTimeout(1_000);
  }
  return false;
}

async function captureCompletedResponse(context: BrowserContext, fallback: Page, gphcNumber: string) {
  const deadline = Date.now() + 10 * 60_000;
  let lastProgressAt = Date.now();
  let previous = "";
  let stableReads = 0;
  while (Date.now() < deadline) {
    const page = activeChatgptPage(context, fallback);
    const body = await page.locator("body").innerText();
    if (limitPattern.test(body)) throw new Error("CHATGPT_LIMIT_REACHED");
    if (manualCheckPattern.test(body) || await page.getByRole("button", { name: "Log in", exact: true }).count() > 0) throw new Error("CHATGPT_MANUAL_REVIEW");
    const visibleDecision = decisionJsonInPage(body, gphcNumber);
    const assistantText = visibleDecision ? "" : await latestAssistantText(page);
    const response = visibleDecision || assistantText;
    const streaming = await page.locator('button[aria-label*="Stop" i]:visible, button[data-testid*="stop" i]:visible').count() > 0;
    stableReads = response && response === previous ? stableReads + 1 : 0;
    previous = response;
    if (stableReads >= (streaming ? 10 : 3)) return response;
    if (Date.now() - lastProgressAt >= 15_000) {
      stdout.write(`  Waiting for ChatGPT reply: decisionVisible=${Boolean(visibleDecision)}, assistantTextLength=${assistantText.length}, stableReads=${stableReads}, streaming=${streaming}, elapsedSeconds=${Math.round((Date.now() - (deadline - 10 * 60_000)) / 1_000)}.\n`);
      lastProgressAt = Date.now();
    }
    await page.waitForTimeout(1_000);
  }
  throw new Error("ChatGPT did not complete a stable response within ten minutes.");
}

async function main() {
  const inputPath = resolve(process.cwd(), optionValue("--input") ?? defaultInput);
  const outputPath = resolve(process.cwd(), optionValue("--output") ?? defaultOutput);
  const profilePath = resolve(process.cwd(), optionValue("--profile") ?? defaultProfile);
  if (process.argv.includes("--check-sign-in") || process.argv.includes("--sign-in")) {
    if (!existsSync(profilePath)) throw new Error(`Patchright profile does not exist: ${profilePath}`);
    stdout.write(`Using existing Patchright profile: ${profilePath}\n`);
    const launchOptions = { channel: "chrome" as const, headless: false, viewport: null, args: ["--start-maximized"] };
    const context = await chromium.launchPersistentContext(profilePath, launchOptions);
    let signedIn = false;
    let diagnostics: Awaited<ReturnType<typeof signInDiagnostics>> | null = null;
    try {
      const page = context.pages()[0] ?? await context.newPage();
      await gotoWithNetworkRetry(page, chatgptUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
      if (process.argv.includes("--sign-in")) {
        stdout.write(`Sign into ChatGPT in the opened browser. Waiting up to 15 minutes in ${profilePath}.\n`);
        const deadline = Date.now() + 15 * 60_000;
        while (Date.now() < deadline) {
          if (await hasSignedInChatgptUi(context, page)) {
            try {
              await page.reload({ waitUntil: "commit", timeout: 20_000 });
            } catch {
              stdout.write("ChatGPT reload was slow; checking the page state directly.\n");
            }
            signedIn = await waitForSignedInChatgptUi(context, page, 20_000);
            if (signedIn) break;
          }
          await page.waitForTimeout(2_000);
        }
      } else {
        signedIn = await waitForSignedInChatgptUi(context, page, 30_000);
      }
      if (!signedIn) diagnostics = await signInDiagnostics(context, page);
    } finally { await context.close(); }
    if (signedIn && process.argv.includes("--sign-in")) {
      stdout.write("Checking whether sign-in survives reopening the browser.\n");
      const reopened = await chromium.launchPersistentContext(profilePath, launchOptions);
      try {
        const page = reopened.pages()[0] ?? await reopened.newPage();
        await gotoWithNetworkRetry(page, chatgptUrl, { waitUntil: "commit", timeout: 60_000 });
        signedIn = await waitForSignedInChatgptUi(reopened, page, 20_000);
        if (!signedIn) diagnostics = await signInDiagnostics(reopened, page);
      } finally { await reopened.close(); }
    }
    stdout.write(`ChatGPT signed in to workflow profile: ${signedIn ? "YES" : "NO"}\n`);
    if (!signedIn && diagnostics) {
      stdout.write(`  Diagnostics: loginVisible=${diagnostics.loginVisible}, newChatVisible=${diagnostics.newChatVisible}, composerVisible=${diagnostics.composerVisible}, hasAuthCookie=${diagnostics.hasAuthCookie} (cookie names: ${diagnostics.authCookieNames.join(", ") || "none"}; total ${diagnostics.totalCookies}).\n`);
    }
    if (!signedIn) process.exitCode = 2;
    return;
  }
  const limit = positiveNumber("--limit", 5);
  const selectedSequence = optionValue("--source-sequence");
  const resumeChatUrl = optionValue("--resume-chat-url");
  if (resumeChatUrl && (!selectedSequence || !/^https:\/\/chatgpt\.com\/c\/[a-z0-9-]+\/?$/i.test(resumeChatUrl))) {
    throw new Error("--resume-chat-url requires one --source-sequence and a ChatGPT conversation URL.");
  }
  const source = readJsonl<GoogleRecord>(inputPath).filter(record => record.status === "RECEIVED" && record.google?.responseText);
  const existing = readJsonl<RefinedRecord>(outputPath);
  const reviewed = new Set(existing.filter(record => record.status === "REVIEWED").map(record => record.sourceGoogleSequence));
  const pending = source.filter(record => !reviewed.has(record.sequence) && (!selectedSequence || record.sequence === Number(selectedSequence))).slice(0, limit);
  if (!pending.length) {
    stdout.write("No unreviewed Google records remain.\n");
    return;
  }

  const context = await chromium.launchPersistentContext(profilePath, {
    channel: "chrome",
    headless: false,
    viewport: null,
    args: ["--start-maximized"],
  });
  let page = context.pages()[0] ?? await context.newPage();
  let sequence = existing.length;
  try {
    await gotoWithNetworkRetry(page, chatgptUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await waitForManualClearance(page);
    for (const [index, record] of pending.entries()) {
      const requestedAt = new Date().toISOString();
      stdout.write(`[${index + 1}/${pending.length}] ${record.candidate.tradingName} (${record.candidate.gphcNumber})\n`);
      try {
        page = activeChatgptPage(context, page);
        await gotoWithNetworkRetry(page, resumeChatUrl ?? chatgptUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
        const evidenceRecord = fullResearchForReview(record, source);
        if (!resumeChatUrl) await sendPrompt(page, reviewPrompt(evidenceRecord));
        else stdout.write("  Reading the existing ChatGPT reply without sending another prompt.\n");
        const chatgptResponse = await captureCompletedResponse(context, page, record.candidate.gphcNumber);
        const decision = parseDecision(evidenceRecord, chatgptResponse);
        appendJsonl(outputPath, { schemaVersion: 1, sequence: ++sequence, status: "REVIEWED", sourceGoogleSequence: record.sequence, requestedAt, receivedAt: new Date().toISOString(), decision });
        stdout.write(`  ${decision.status}: ${decision.reason.slice(0, 120)}\n`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const statusByError = {
          CHATGPT_LIMIT_REACHED: "LIMIT_REACHED",
          CHATGPT_MANUAL_REVIEW: "MANUAL_REVIEW",
        } as const;
        const status = statusByError[message as keyof typeof statusByError] ?? "ERROR";
        const chatUrl = context.pages().reverse().find(candidate => !candidate.isClosed() && candidate.url().includes("chatgpt.com"))?.url();
        appendJsonl(outputPath, { schemaVersion: 1, sequence: ++sequence, status, sourceGoogleSequence: record.sequence, requestedAt, receivedAt: new Date().toISOString(), error: message, chatUrl });
        stdout.write(`  ${status}: ${message}\n  Existing ChatGPT conversation: ${chatUrl}\n`);
        process.exitCode = 2;
        break;
      }
      await page.waitForTimeout(3_000);
    }
  } finally {
    await context.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
