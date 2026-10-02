import { extractPriceSignals } from "./price-signal-extraction";

export type AuditedProduct = {
  name: string;
  priceGbp: string | null;
  priceBasis: string | null;
  erectileDysfunction: boolean;
  evidenceType: "PRODUCT_JSON_LD" | "PRODUCT_PAGE_HEADING";
};

export type AuditClassification =
  | "VERIFIED_PRICED_PRODUCTS"
  | "PRODUCT_LISTED_PRICE_UNVERIFIED"
  | "NO_PRODUCT_ON_CITED_PAGE"
  | "NEEDS_REVIEW";

const edMedicinePattern = /\b(?:sildenafil|tadalafil|vardenafil|avanafil|viagra|cialis|levitra|spedra|caverject|vitaros)\b/i;
const productPathPattern = /\/(?:product|products)\/[^/?#]+/i;
const servicePathPattern = /\/(?:ear-clinic|pharmacy-first|book(?:ing)?|appointment|services?)\/?(?:[?#].*)?$/i;

function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.replace(/\s+/g, " ").trim() : null;
}

function normalizeGbp(value: unknown, currency: unknown): string | null {
  if (currency !== "GBP" || (typeof value !== "number" && typeof value !== "string")) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount.toFixed(2) : null;
}

function productOffers(product: Record<string, unknown>): Array<{ priceGbp: string; priceBasis: string | null }> {
  const entries = Array.isArray(product.offers) ? product.offers : [product.offers];
  return entries.flatMap(entry => {
    if (!entry || typeof entry !== "object") return [];
    const offer = entry as Record<string, unknown>;
    const priceGbp = normalizeGbp(offer.price, offer.priceCurrency);
    return priceGbp ? [{ priceGbp, priceBasis: textValue(offer.name) ?? textValue(offer.sku) }] : [];
  });
}

function headingProductName(html: string): string | null {
  const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  return heading ? textValue(heading.replace(/<[^>]+>/g, " ").replace(/&amp;/gi, "&").replace(/&nbsp;/gi, " ")) : null;
}

export function auditKnownProductPage(html: string, pageUrl: string): { classification: AuditClassification; products: AuditedProduct[]; reason: string } {
  const products: AuditedProduct[] = [];
  for (const node of extractPriceSignals(html).jsonLdOffers) {
    if (!node || typeof node !== "object") continue;
    const product = node as Record<string, unknown>;
    const types = Array.isArray(product["@type"]) ? product["@type"] : [product["@type"]];
    if (!types.includes("Product")) continue;
    const name = textValue(product.name);
    if (!name) continue;
    const offers = productOffers(product);
    if (!offers.length) {
      products.push({ name, priceGbp: null, priceBasis: null, erectileDysfunction: edMedicinePattern.test(name), evidenceType: "PRODUCT_JSON_LD" });
      continue;
    }
    for (const offer of offers) products.push({ name, ...offer, erectileDysfunction: edMedicinePattern.test(name), evidenceType: "PRODUCT_JSON_LD" });
  }
  const deduped = [...new Map(products.map(product => [JSON.stringify(product), product])).values()];
  if (deduped.some(product => product.priceGbp !== null)) {
    return { classification: "VERIFIED_PRICED_PRODUCTS", products: deduped, reason: "Named Product JSON-LD on the cited page contains an explicit GBP offer price." };
  }
  if (deduped.length) {
    return { classification: "PRODUCT_LISTED_PRICE_UNVERIFIED", products: deduped, reason: "Named Product JSON-LD is present, but no explicit GBP offer price was verified." };
  }
  const url = new URL(pageUrl);
  if (productPathPattern.test(url.pathname)) {
    const name = headingProductName(html);
    if (name && !/^(?:all\s+)?(?:products?|shop|catalogue|treatments?|medicines|online pharmacy)$/i.test(name)) return {
      classification: "PRODUCT_LISTED_PRICE_UNVERIFIED",
      products: [{ name, priceGbp: null, priceBasis: null, erectileDysfunction: edMedicinePattern.test(name), evidenceType: "PRODUCT_PAGE_HEADING" }],
      reason: "The cited product-path page names a product in its heading, but a product-specific GBP price was not verified.",
    };
  }
  if (servicePathPattern.test(url.pathname)) {
    return { classification: "NO_PRODUCT_ON_CITED_PAGE", products: [], reason: "The cited page is a service or appointment page and contains no named Product JSON-LD. This is not a site-wide absence claim." };
  }
  return { classification: "NEEDS_REVIEW", products: [], reason: "The cited page did not expose a verifiable named product-and-price pair; it may be a treatment or category listing." };
}
