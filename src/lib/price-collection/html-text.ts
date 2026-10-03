// A page's visible text as a list, one entry per element, for readers that follow the order things
// appear in (a heading, then its strengths, then their prices) rather than the markup around them.

export function decodeHtmlText(text: string) {
  return text
    .replace(/&pound;|&#163;/gi, "£")
    .replace(/&#8211;|&ndash;/gi, "–")
    .replace(/&#8212;|&mdash;/gi, "—")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function htmlTextItems(html: string): string[] {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .split(/<[^>]+>/)
    .map(decodeHtmlText)
    .filter(Boolean);
}
