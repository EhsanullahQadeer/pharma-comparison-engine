import type { ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { brandSideMatches, labelMatchesVariant, type VariantSpec } from "@/lib/price-collection/variant-label";

// Strength and pack-size dropdowns whose options carry their own data (e.g. Simple Online Pharmacy):
//   <select class="itemStrengths"> Generic Viagra (Sildenafil) / Pfizer - 25mg / …
//   <select class="itemSizes"><option data-dose="Pfizer - 50mg" data-quantity="4"
//     data-legacy-size-name="50mg x 4" data-price="29.95" data-sale="0" data-sale-price="0">
// The option's dose ("Generic Viagra (Sildenafil)" / "Pfizer - 50mg") decides branded vs generic; the
// page heading supplies the product name ("Viagra") that the Pfizer options leave out.

function decode(text: string) {
  return text.replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#0?39;/g, "'").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function attribute(tag: string, name: string) {
  const value = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"))?.[1];
  return value === undefined ? undefined : decode(value);
}

// The sale price while the option is marked on sale, otherwise the listed price.
function optionPricePence(tag: string) {
  const sale = attribute(tag, "data-sale") === "1" ? Number(attribute(tag, "data-sale-price")) : NaN;
  const price = sale > 0 ? sale : Number(attribute(tag, "data-price"));
  return price > 0 ? Math.round(price * 100) : undefined;
}

export function pickSelectOptionPrice(html: string, matchedTokens: string[], variant: VariantSpec, sourceUrl: string): ScrapedPrice | undefined {
  const name = decode(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
  if (!name) return undefined;

  const matches: { itemPricePence: number; evidence: string }[] = [];
  for (const [tag] of html.matchAll(/<option\b[^>]*\bdata-dose\s*=[^>]*>/gi)) {
    const dose = attribute(tag, "data-dose");
    const size = attribute(tag, "data-legacy-size-name") ?? attribute(tag, "data-quantity");
    const itemPricePence = optionPricePence(tag);
    if (!dose || !size || itemPricePence === undefined) continue;
    // A bare count ("4") under a dose that names the strength ("Pfizer - 50mg") is that many tablets.
    const pack = /^\d{1,3}$/.test(size) ? `${size} tablets` : size;
    const label = `${name} ${dose} ${pack}`;
    if (!brandSideMatches(name, dose, matchedTokens[0], variant.generic)) continue;
    if (!labelMatchesVariant(label, matchedTokens, variant)) continue;
    matches.push({ itemPricePence, evidence: label });
  }
  if (new Set(matches.map((match) => match.itemPricePence)).size !== 1) return undefined;
  return {
    ...matches[0],
    deliveryFeePence: 0,
    deliveryAssumption: "As shown on the provider's product page at collection time",
    availability: "UNKNOWN",
    sourceUrl,
    source: "select-option-data",
  };
}
