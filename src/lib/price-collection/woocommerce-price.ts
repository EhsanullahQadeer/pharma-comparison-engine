import type { ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { brandSideMatches, labelMatchesVariant, type VariantSpec } from "@/lib/price-collection/variant-label";

// WooCommerce variable products (strength / pack-size dropdowns — e.g. Pharmaceutra, Be Online,
// Razi Meds, Newtons Chemist) embed every dropdown combination and its price as JSON in the add-to-
// cart form's `data-product_variations` attribute. Each combination is checked with the same
// conservative label rule as the feed/JSON-LD steps, built from the product's ingredient/brand token
// plus the combination's own option values — never the product title's strengths, since a title like
// "Cialis 10mg & 20mg Tablets" names several. Every matching combination must agree on one price.

type WooVariation = {
  attributes?: Record<string, string>;
  display_price?: unknown;
  is_in_stock?: unknown;
};

function decodeEntities(text: string) {
  return text
    .replace(/&quot;/g, "\"")
    .replace(/&#0?39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function readVariations(html: string): WooVariation[] | undefined {
  const raw = html.match(/data-product_variations="([^"]*)"/)?.[1];
  // "false" means the shop loads variations over AJAX (too many to embed) — nothing to read here.
  if (!raw || raw === "false") return undefined;
  try {
    const parsed: unknown = JSON.parse(decodeEntities(raw));
    return Array.isArray(parsed) ? (parsed as WooVariation[]) : undefined;
  } catch {
    return undefined;
  }
}

// Non-empty choices of each attribute dropdown (<select name="attribute_…">), by attribute name.
function readAttributeOptions(html: string) {
  const options = new Map<string, string[]>();
  for (const select of html.matchAll(/<select[^>]*name="(attribute_[^"]+)"[^>]*>([\s\S]*?)<\/select>/gi)) {
    const values = [...select[2].matchAll(/<option[^>]*value="([^"]+)"[^>]*>([\s\S]*?)<\/option>/gi)].map((option) => decodeEntities(option[2].replace(/<[^>]+>/g, "").trim()));
    options.set(select[1], values.filter(Boolean));
  }
  return options;
}

function productName(html: string) {
  const heading = html.match(/<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return decodeEntities((heading ?? title ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

// One option value as label text: taxonomy slugs lose their hyphens ("4-tablets" → "4 tablets"), and
// a bare number on a quantity/pack attribute gets its unit ("4" → "4 tablets").
function optionText(attribute: string, value: string) {
  const text = value.replace(/-/g, " ").trim();
  return /quantity|pack|size|tablet/i.test(attribute) && /^\d{1,3}$/.test(text) ? `${text} tablets` : text;
}

export function pickWooCommercePrice(html: string, matchedTokens: string[], variant: VariantSpec, sourceUrl: string): ScrapedPrice | undefined {
  const variations = readVariations(html);
  if (!variations?.length) return undefined;
  const name = productName(html);
  const nameToken = matchedTokens.find((token) => name.toLowerCase().includes(token.toLowerCase()));
  if (!nameToken) return undefined;
  const nameStrengths = [...new Set([...name.matchAll(/(\d{1,3}(?:\.\d+)?)\s*mg\b/gi)].map((match) => match[1]))];
  const dropdowns = readAttributeOptions(html);

  const matches: { itemPricePence: number; availability: ScrapedPrice["availability"]; evidence: string }[] = [];
  for (const variation of variations) {
    const parts: string[] = [];
    let ambiguous = false;
    for (const [attribute, value] of Object.entries(variation.attributes ?? {})) {
      // A blank value means "any choice" — only usable when the dropdown offers exactly one.
      const choices = dropdowns.get(attribute) ?? [];
      if (!value && choices.length !== 1) ambiguous = true;
      parts.push(optionText(attribute, value || choices[0] || ""));
    }
    if (ambiguous) continue;
    const optionsLabel = parts.filter(Boolean).join(" ");
    // Branded and generic packs can share one dropdown ("Viagra (Branded) 50mg" / "Sildenafil
    // (Generic) 50mg"), or the product itself is one side ("Sildenafil (Viagra) Tablets" is generic).
    if (!brandSideMatches(name, optionsLabel, matchedTokens[0], variant.generic)) continue;
    // Strength normally comes from the options; a single-strength product may only state it in its name.
    const strengthText = /\d\s*mg\b/i.test(optionsLabel) || nameStrengths.length !== 1 ? "" : ` ${nameStrengths[0]}mg`;
    const label = `${nameToken} ${optionsLabel}${strengthText}`;
    if (!labelMatchesVariant(label, matchedTokens, variant)) continue;
    const price = typeof variation.display_price === "number" ? variation.display_price : Number(variation.display_price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const stock = { true: "IN_STOCK", false: "OUT_OF_STOCK" } as const;
    matches.push({
      itemPricePence: Math.round(price * 100),
      availability: typeof variation.is_in_stock === "boolean" ? stock[`${variation.is_in_stock}`] : "UNKNOWN",
      evidence: `${name}: ${optionsLabel}`,
    });
  }
  if (new Set(matches.map((match) => match.itemPricePence)).size !== 1) return undefined;
  return {
    ...matches[0],
    deliveryFeePence: 0,
    deliveryAssumption: "As shown on the provider's product page at collection time",
    sourceUrl,
    source: "woocommerce-variation-data",
  };
}
