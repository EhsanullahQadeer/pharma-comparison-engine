import type { ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { brandSideMatches, labelMatchesVariant, type VariantSpec } from "@/lib/price-collection/variant-label";

// Pharmica-style product pages (ASP.NET WebForms): a treatment dropdown (`ddlAlternate`, e.g.
// "Viagra (Branded - More Expensive)" / "Sildenafil (Generic Viagra)"), a strength dropdown
// (`ddlTypes`) whose options the page's script swaps per treatment, and an inline price table
//   prices[<strength option id>] = [[<pack size>, <price per tablet>, …], …];
// where a pack costs size × per-tablet price. The script's own
//   if($('#…ddlAlternate').val()==<treatment>){ …append($('<option>', { value: <id>, text: '<strength>' …
// lines say which treatment each strength option belongs to.

function decode(text: string) {
  return text.replace(/&amp;/g, "&").replace(/&#39;|&#x27;/g, "'").replace(/\s+/g, " ").trim();
}

export function pickPerTabletPriceTable(html: string, matchedTokens: string[], variant: VariantSpec, sourceUrl: string): ScrapedPrice | undefined {
  const table = new Map<string, [number, number][]>();
  for (const match of html.matchAll(/prices\[(\d+)\]\s*=\s*(\[\[[\d.,[\]\s]*\]\]);/g)) {
    try {
      const rows = (JSON.parse(match[2]) as unknown[][]).filter((row) => typeof row[0] === "number" && typeof row[1] === "number") as [number, number][];
      table.set(match[1], rows);
    } catch {
      // A malformed table for one strength; others may still be usable.
    }
  }
  if (table.size === 0) return undefined;

  const treatments = new Map<string, string>();
  for (const option of html.matchAll(/<select[^>]*id="[^"]*ddlAlternate"[^>]*>([\s\S]*?)<\/select>/gi)) {
    for (const item of option[1].matchAll(/<option[^>]*value="(\d+)"[^>]*>([\s\S]*?)<\/option>/gi)) treatments.set(item[1], decode(item[2]));
  }
  // strength option id → { treatment name, strength text }
  const strengths = new Map<string, { treatment: string; strength: string }>();
  for (const item of html.matchAll(/ddlAlternate'\)\.val\(\)\s*==\s*(\d+)\)\s*\{[^}]*?value:\s*(\d+),\s*text:\s*'([^']+)'/g)) {
    strengths.set(item[2], { treatment: treatments.get(item[1]) ?? "", strength: decode(item[3]) });
  }
  // Pages without a treatment switch list their strengths in the strength dropdown only.
  if (strengths.size === 0) {
    const title = decode(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, " ") ?? "");
    for (const select of html.matchAll(/<select[^>]*id="[^"]*ddlTypes"[^>]*>([\s\S]*?)<\/select>/gi)) {
      for (const item of select[1].matchAll(/<option[^>]*value="(\d+)"[^>]*>([\s\S]*?)<\/option>/gi)) strengths.set(item[1], { treatment: title, strength: decode(item[2]) });
    }
  }

  const matches: { itemPricePence: number; evidence: string }[] = [];
  for (const [id, rows] of table) {
    const option = strengths.get(id);
    if (!option) continue;
    if (!brandSideMatches(option.treatment, option.treatment, matchedTokens[0], variant.generic)) continue;
    for (const [packSize, perTablet] of rows) {
      const label = `${option.treatment} ${option.strength} ${packSize} tablets`;
      if (!labelMatchesVariant(label, matchedTokens, variant)) continue;
      const pence = Math.round(packSize * perTablet * 100);
      if (pence > 0) matches.push({ itemPricePence: pence, evidence: label });
    }
  }
  if (new Set(matches.map((match) => match.itemPricePence)).size !== 1) return undefined;
  return {
    ...matches[0],
    deliveryFeePence: 0,
    deliveryAssumption: "As shown on the provider's product page at collection time",
    availability: "UNKNOWN",
    sourceUrl,
    source: "per-tablet-price-table",
  };
}
