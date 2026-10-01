import type { DetectedDeliveryPolicy, DetectedDiscount } from "@/types/pricing";

// Reads a pharmacy's delivery charge and discount offers out of its own pages' visible wording.
// The wording varies too much to be certain, so everything found here is only a suggestion: it is
// stored with the sentence it came from and a staff member approves it before it is used.

const MAX_SEGMENT_LENGTH = 300;
const MAX_DISCOUNTS = 5;

const entities: Record<string, string> = { "&pound;": "£", "&#163;": "£", "&#xa3;": "£", "&amp;": "&", "&nbsp;": " ", "&#160;": " ", "&#8217;": "'", "&rsquo;": "'", "&#39;": "'", "&quot;": '"' };

// A page's visible text, one block element per line.
export function pageText(html: string): string {
  return html
    .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/?(?:p|div|li|ul|ol|tr|td|th|table|h[1-6]|br|section|article|header|footer|nav|aside|button|dt|dd)\b[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    // Entities that carry no meaning here (&reg;, &trade;, …) become a space.
    .replace(/&(?:[a-z]+|#\d+|#x[0-9a-f]+);/gi, (entity) => entities[entity.toLowerCase()] ?? " ")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

// Lines split again into sentences, without breaking a price at its decimal point.
function segments(text: string): string[] {
  return text
    .split("\n")
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z£])/))
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment.length <= MAX_SEGMENT_LENGTH);
}

function toPence(amount: string): number {
  return Math.round(Number(amount) * 100);
}

const DELIVERY_WORDS = /\b(?:deliver(?:y|ed|ies)|shipping|postage|royal mail|tracked)\b/i;
const PREMIUM_DELIVERY = /\b(?:next[- ]day|express|special|saturday|same[- ]day|guaranteed|international|europe|overseas|click (?:and|&) collect)\b/i;
// A product row ("Sildenafil 50mg 4 tablets £14.99") that happens to mention delivery.
const PRODUCT_ROW = /\b\d+(?:\.\d+)?\s?mg\b|\b\d+\s*(?:tablets?|pills?|capsules?)\b/i;
const FREE_OVER = /(?:over|above|spend(?:ing)?|orders? of|more than)\s*£\s?(\d+(?:\.\d{1,2})?)/i;
const ALWAYS_FREE = /\bfree\s+(?:[a-z-]+\s+){0,3}(?:delivery|shipping|postage)\s+(?:on\s+)?(?:all|every)\s+orders?\b(?!\s+(?:over|above|of|from|when|if)\b)/i;
// An amount that is a spending level or a starting product price, not a charge.
const NOT_A_FEE = /(?:over|above|under|below|spend(?:ing)?|orders? of|more than|less than|minimum|worth)\s*$/i;
const MIN_FEE_PENCE = 50;
const MAX_FEE_PENCE = 1500;

export function readDeliveryPolicy(text: string): DetectedDeliveryPolicy | undefined {
  const relevant = segments(text).filter((segment) => DELIVERY_WORDS.test(segment) && !PRODUCT_ROW.test(segment));

  const thresholdSegment = relevant.find((segment) => /\bfree\b/i.test(segment) && FREE_OVER.test(segment));
  const thresholdAmount = thresholdSegment?.match(FREE_OVER)?.[1];
  const freeOverPence = thresholdAmount ? toPence(thresholdAmount) : null;

  const fees: { feePence: number; segment: string; premium: boolean }[] = [];
  for (const segment of relevant) {
    for (const match of segment.matchAll(/£\s?(\d+(?:\.\d{1,2})?)/g)) {
      const feePence = toPence(match[1]);
      if (feePence < MIN_FEE_PENCE || feePence > MAX_FEE_PENCE || feePence === freeOverPence) continue;
      if (NOT_A_FEE.test(segment.slice(0, match.index))) continue;
      fees.push({ feePence, segment, premium: PREMIUM_DELIVERY.test(segment) });
    }
  }

  // The cheapest standard option; premium services only stand in when nothing else is priced.
  const standard = fees.filter((fee) => !fee.premium);
  const chosen = (standard.length > 0 ? standard : fees).sort((a, b) => a.feePence - b.feePence)[0];
  if (chosen) {
    const evidence = thresholdSegment && thresholdSegment !== chosen.segment ? `${chosen.segment} ${thresholdSegment}` : chosen.segment;
    return { standardFeePence: chosen.feePence, freeOverPence, evidenceText: evidence.slice(0, MAX_SEGMENT_LENGTH * 2) };
  }

  const alwaysFree = relevant.find((segment) => ALWAYS_FREE.test(segment));
  return alwaysFree ? { standardFeePence: 0, freeOverPence: null, evidenceText: alwaysFree } : undefined;
}

// Who a discount is for, from the wording around it. Checked in order; the first hit wins.
const eligibilityRules: [RegExp, string][] = [
  // A reward earned by a first order is for the orders after it, not for new customers.
  [/(?:future|next|second|subsequent) (?:order|purchase)s?|loyalty|returning customers?/i, "Returning customers"],
  [/first (?:order|purchase)|new (?:customer|patient)s?|\bwelcome\b/i, "New customers (first order)"],
  [/subscri|repeat (?:order|prescription)/i, "Subscription orders"],
  [/newsletter|sign(?:ing)?[- ]up/i, "Newsletter sign-up"],
  [/\bstudents?\b/i, "Students"],
  [/\bnhs\b|blue light/i, "NHS and Blue Light card holders"],
  [/(?:all|every) orders?|site-?wide|everything/i, "All orders"],
];
const UNSTATED_ELIGIBILITY = "See the pharmacy's terms";
// An offer tied to another of the pharmacy's services is not a discount on what this site compares.
const OTHER_SERVICE = /weight[- ]?(?:loss|management)|slimming|mounjaro|wegovy|hair[- ]?loss|travel (?:clinic|vaccin)|vaccin|skin ?care|contact lens|ear wax/i;

const PERCENT_OFF = /(\d{1,2})\s?%\s*(?:off|discount)|save\s+(\d{1,2})\s?%/i;
const AMOUNT_OFF = /£\s?(\d+(?:\.\d{2})?)\s*(?:off|discount)|save\s+£\s?(\d+(?:\.\d{2})?)/i;
// The word "code" in any case, then the code itself exactly as written: capitals and digits only.
const DISCOUNT_CODE = /\b[Cc][Oo][Dd][Ee]\b[:\s]*(?:is\s+)?["'“‘]?([A-Z0-9][A-Z0-9_-]{2,19})(?![A-Za-z0-9])/;
const NOT_A_CODE = new Set(["BELOW", "HERE", "NOW", "TODAY", "CHECKOUT", "AND", "FOR", "THE", "YOUR", "WHEN", "WITH"]);

function readCode(segment: string): string | null {
  const code = segment.match(DISCOUNT_CODE)?.[1];
  return code && /[A-Z]/.test(code) && !NOT_A_CODE.has(code) ? code : null;
}

export function readDiscountOffers(text: string): DetectedDiscount[] {
  const found = new Map<string, DetectedDiscount>();
  for (const segment of segments(text)) {
    const percent = segment.match(PERCENT_OFF);
    const amount = percent ? null : segment.match(AMOUNT_OFF);
    if ((!percent && !amount) || OTHER_SERVICE.test(segment)) continue;

    const code = readCode(segment);
    const eligibility = eligibilityRules.find(([pattern]) => pattern.test(segment))?.[1];
    // A bare "20% off" badge says neither who it is for nor how to claim it.
    if (!code && !eligibility) continue;

    const valuePercent = percent ? Number(percent[1] ?? percent[2]) : null;
    const valuePence = amount ? toPence(amount[1] ?? amount[2]) : null;
    if (valuePercent === 0 || valuePence === 0) continue;

    const key = [code ?? "", valuePercent ?? "", valuePence ?? "", code ? "" : eligibility].join("|");
    if (!found.has(key)) {
      found.set(key, {
        code,
        valueType: percent ? "PERCENT" : "FIXED_AMOUNT",
        valuePercent,
        valuePence,
        eligibility: eligibility ?? UNSTATED_ELIGIBILITY,
        evidenceText: segment,
      });
    }
  }
  return [...found.values()].slice(0, MAX_DISCOUNTS);
}
