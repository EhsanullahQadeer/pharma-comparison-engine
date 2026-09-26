// Affiliate link templates (referral-earnings-plan Phase 2). Pure and browser-safe, so the admin
// programme form validates templates with exactly the rules the server and /go apply.

// {url} is the offer's product page URL-encoded (for a network's deep-link parameter); {rawUrl} is
// the product page as-is and may only start the template (for a direct deal that appends its own
// tracking parameter); {clickRef} is our opaque click id. Nothing else about the visit can ever be
// put into a partner URL.
const SAMPLE_DESTINATION = "https://pharmacy.example/products/sildenafil-50mg?pack=8";

export function buildTrackedUrl(template: string, destination: string, clickRef: string) {
  let url = template;
  if (url.startsWith("{rawUrl}")) {
    const rest = url.slice("{rawUrl}".length);
    // Appending "?ref=…" to a URL that already has a query string needs "&" instead.
    url = destination + (rest.startsWith("?") && destination.includes("?") ? `&${rest.slice(1)}` : rest);
  }
  return url.replaceAll("{url}", encodeURIComponent(destination)).replaceAll("{clickRef}", encodeURIComponent(clickRef));
}

export function linkTemplateError(template: string): string | null {
  const placeholders = [...template.matchAll(/\{([^{}]*)\}/g)].map((match) => match[1]);
  const unknown = placeholders.find((name) => !["url", "rawUrl", "clickRef"].includes(name));
  if (unknown !== undefined) return `Unknown placeholder {${unknown}}. Use {url}, {rawUrl} or {clickRef}.`;
  if (/[{}]/.test(template.replace(/\{(url|rawUrl|clickRef)\}/g, ""))) return "The template has an unmatched { or }.";
  if (!placeholders.includes("url") && !placeholders.includes("rawUrl")) return "Include {url} or {rawUrl} so visitors land on the product they chose.";
  if (placeholders.includes("rawUrl") && (!template.startsWith("{rawUrl}") || placeholders.filter((name) => name === "rawUrl").length > 1)) return "{rawUrl} can only appear once, at the very start.";
  let url: URL;
  try {
    url = new URL(buildTrackedUrl(template, SAMPLE_DESTINATION, "sample"));
  } catch {
    return "The template doesn't make a valid web address.";
  }
  if (url.protocol !== "https:" || url.username || url.password) return "The tracked link must be a plain https:// address.";
  return null;
}
