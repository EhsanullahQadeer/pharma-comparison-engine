import type { Metadata } from "next";

// M1 compliance gate (docs/milestones/01-scope-and-compliance.md): every page that shows prices for
// prescription-only medicines stays out of search indexes until a solicitor has reviewed third-party
// POM price display. Tracked as an M8 launch gate — lift it here, in one place, once signed off.
export const pomPricingRobots: Metadata["robots"] = { index: false, follow: true };

// JSON-LD lives in a script element, so encode characters that could otherwise terminate that
// element if a staff-entered title, summary or provider name contained HTML-like text.
const jsonLdEscapes: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => jsonLdEscapes[character] ?? character);
}
