const productPathPattern = /\/(?:products?|shop|treatments?|medicines?|medications?|collections?|erectile-dysfunction)(?:\/|$)/i;
const productSchemaPattern = /["']@type["']\s*:\s*(?:\[[^\]]*)?["']Product["']/i;
const consultationRequiredPattern = /\bconsultation\b[^.!?]{0,100}\brequired\b/i;
const transactionalPattern = /\b(?:add to (?:basket|cart)|buy now|from\s*£\s*\d|£\s*\d+(?:\.\d{2})?)\b/i;
const prescriptionFirstPattern = /\b(?:prescription(?:[- ]only)?|consultation)[^.!?]{0,100}\b(?:required|before|first)|\bwe(?:'|’)ll contact you\b/i;

export type ProductListingAssessment = {
  classification: "PRODUCT_LISTING" | "PRESCRIPTION_FIRST" | "NO_PRODUCT_LISTING";
  evidence: string[];
};

export function hasProductListingPath(url: string): boolean {
  try {
    return productPathPattern.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

export function assessProductListing(homepageHtml: string, inspectedPages: { url: string; html: string }[]): ProductListingAssessment {
  const evidence: string[] = [];
  for (const page of inspectedPages) {
    const pathMatch = hasProductListingPath(page.url);
    const productSchema = productSchemaPattern.test(page.html);
    const transactional = transactionalPattern.test(page.html);
    if (productSchema || (pathMatch && transactional)) {
      if (productSchema) evidence.push(`${page.url}: Product structured data`);
      if (pathMatch && transactional) evidence.push(`${page.url}: product path and price/basket control`);
    }
  }
  if (evidence.length) return { classification: "PRODUCT_LISTING", evidence };
  if (prescriptionFirstPattern.test(homepageHtml) || consultationRequiredPattern.test(homepageHtml)) {
    return { classification: "PRESCRIPTION_FIRST", evidence: ["Homepage describes a prescription or consultation-first service without product-listing evidence."] };
  }
  return { classification: "NO_PRODUCT_LISTING", evidence: ["No product structured data or product path with a price/basket control was found."] };
}
