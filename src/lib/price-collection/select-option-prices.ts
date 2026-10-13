import type { ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { brandSideMatches, labelMatchesVariant, type VariantSpec } from "@/lib/price-collection/variant-label";

// Strength and pack-size choices whose options carry their own data. Three layouts are read:
// - Simple Online Pharmacy: real <select>s —
//     <select class="itemStrengths"> Generic Viagra (Sildenafil) / Pfizer - 25mg / …
//     <select class="itemSizes"><option data-dose="Pfizer - 50mg" data-quantity="4"
//       data-legacy-size-name="50mg x 4" data-price="29.95" data-sale="0" data-sale-price="0">
//   The option's dose ("Generic Viagra (Sildenafil)" / "Pfizer - 50mg") decides branded vs generic.
// - Cloud Pharmacy: one custom listbox of buttons holding strength, pack and price together —
//     <button role="option" data-size-id="242389" data-name="10mg x 4" data-price="£18.99"
//       data-was="" data-in-stock="1">
// - Online Pharmacy 4U: pack buttons that each show their price (see pricedButtons).
// In every layout the page heading supplies the product name the options leave out.

type PricedOption = { optionText: string; label: string; itemPricePence: number; availability: ScrapedPrice["availability"] };

function decode(text: string) {
  return text.replace(/&amp;/g, "&").replace(/&pound;|&#163;/gi, "£").replace(/&quot;/g, "\"").replace(/&#0?39;/g, "'").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function attribute(tag: string, name: string) {
  const value = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"))?.[1];
  return value === undefined ? undefined : decode(value);
}

function toPence(value: string | undefined) {
  const amount = Number((value ?? "").replace(/^£\s*/, ""));
  return amount > 0 ? Math.round(amount * 100) : undefined;
}

// <option data-dose …>: the sale price while the option is marked on sale, otherwise the listed one.
function selectOptions(html: string, name: string): PricedOption[] {
  return [...html.matchAll(/<option\b[^>]*\bdata-dose\s*=[^>]*>/gi)].flatMap(([tag]) => {
    const dose = attribute(tag, "data-dose");
    const size = attribute(tag, "data-legacy-size-name") ?? attribute(tag, "data-quantity");
    const sale = attribute(tag, "data-sale") === "1" ? toPence(attribute(tag, "data-sale-price")) : undefined;
    const itemPricePence = sale ?? toPence(attribute(tag, "data-price"));
    if (!dose || !size || itemPricePence === undefined) return [];
    // A bare count ("4") under a dose that names the strength ("Pfizer - 50mg") is that many tablets.
    const pack = /^\d{1,3}$/.test(size) ? `${size} tablets` : size;
    return [{ optionText: dose, label: `${name} ${dose} ${pack}`, itemPricePence, availability: "UNKNOWN" as const }];
  });
}

// role="option" buttons: `data-price` is the current price (`data-was` the one before a reduction).
// The heading's own strength list ("Sildenafil Tablets (25mg, 50mg & 100mg)") is left out of the
// label, since each option names its strength.
function listboxOptions(html: string, name: string): PricedOption[] {
  const product = name.replace(/\d{1,3}(?:\.\d+)?\s*mg\b/gi, "");
  const stock = { 1: "IN_STOCK", 0: "OUT_OF_STOCK" } as const;
  return [...html.matchAll(/<(?:button|li|div|a)\b[^>]*\bdata-size-id\s*=[^>]*>/gi)].flatMap(([tag]) => {
    const optionName = attribute(tag, "data-name");
    const itemPricePence = toPence(attribute(tag, "data-price"));
    if (!optionName || itemPricePence === undefined) return [];
    return [{ optionText: optionName, label: `${product} ${optionName}`, itemPricePence, availability: stock[attribute(tag, "data-in-stock") as "0" | "1"] ?? "UNKNOWN" }];
  });
}

// Pack buttons that show their own price, under a group heading that may name the one strength:
//   <h3>Pack Size - 50mg<span>4 Tablets</span></h3> … <button>8 Tablets<span>£43.90</span></button>
// The page heading repeats the pack currently chosen ("Viagra Connect (4 Tablets)"), which is
// dropped so every button is labelled with its own pack only.
function pricedButtons(html: string, name: string): PricedOption[] {
  const product = name.replace(/\(\s*\d{1,3}\s[^)]*\)\s*$/, "").trim();
  const options: PricedOption[] = [];
  let groupStrength = "";
  for (const [, group, button, price] of html.matchAll(/<h3\b[^>]*>([^<]*)<|<button\b[^>]*>([^<]{1,60})<span\b[^>]*>\s*(£\s*\d[\d.,]*)\s*<\/span>\s*<\/button>/gi)) {
    if (group !== undefined) {
      groupStrength = group.match(/\d{1,3}(?:\.\d+)?\s*mg\b/i)?.[0] ?? "";
      continue;
    }
    const itemPricePence = toPence(price.replace(/[\s,]/g, ""));
    if (itemPricePence === undefined) continue;
    const strength = /\d\s*mg\b/i.test(product) ? "" : groupStrength;
    options.push({ optionText: decode(button), label: `${product} ${strength} ${decode(button)}`.replace(/\s+/g, " "), itemPricePence, availability: "UNKNOWN" });
  }
  return options;
}

export function pickSelectOptionPrice(html: string, matchedTokens: string[], variant: VariantSpec, sourceUrl: string): ScrapedPrice | undefined {
  const name = decode(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
  if (!name) return undefined;

  const matches = [...selectOptions(html, name), ...listboxOptions(html, name), ...pricedButtons(html, name)]
    .filter((option) => brandSideMatches(name, option.optionText, matchedTokens[0], variant.generic))
    .filter((option) => labelMatchesVariant(option.label, matchedTokens, variant));
  if (new Set(matches.map((match) => match.itemPricePence)).size !== 1) return undefined;
  return {
    itemPricePence: matches[0].itemPricePence,
    availability: matches[0].availability,
    evidence: matches[0].label,
    deliveryFeePence: 0,
    deliveryAssumption: "As shown on the provider's product page at collection time",
    sourceUrl,
    source: "select-option-data",
  };
}
