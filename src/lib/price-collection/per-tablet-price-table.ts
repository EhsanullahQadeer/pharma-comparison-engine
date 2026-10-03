import { decodeHtmlText } from "@/lib/price-collection/html-text";
import type { ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { brandSideMatches, labelMatchesVariant, type VariantSpec } from "@/lib/price-collection/variant-label";
import type { PricedVariantLabel } from "@/types/pricing";

// Pharmica-style price checker (ASP.NET WebForms): dropdowns that the page's own script fills, and a
// price it works out. Nothing in the options carries a price; the script holds all of it:
//   <select id="…ddlAlternate"><option value="27898" data-treatment="branded">Viagra (Branded …)
//   if($('#…ddlAlternate').val()==27898){$('#…ddlTypes').append($('<option>', { value: 34757, text: '25mg (Low Dosage)' }));};
//   if($('#…ddlTypes').val()==34861){$('#…ddlQuantity').empty(); $('#…ddlQuantity').append($('<option>', { value: 28, text: '1 month (28 tablets)' })); …};
//   prices[34757] = [[1,7.4975,1],[8,7.4988,1], …];   // [from this many, price per tablet, in stock]
// The table's first number is where a price band starts, not a pack size: the packs on sale are the
// Quantity dropdown's, and a pack costs its quantity × the per-tablet price of the highest band it
// reaches. The same sum is done here for every generic/branded choice, strength and quantity.

type Choice = { value: string; text: string };
type Band = { from: number; unitPrice: number; inStock: boolean };

function selectChoices(html: string, id: string): (Choice & { treatment?: string })[] {
  const options = html.match(new RegExp(`<select\\b[^>]*\\bid\\s*=\\s*"\\w*${id}"[^>]*>([\\s\\S]*?)<\\/select>`, "i"))?.[1] ?? "";
  return [...options.matchAll(/<option\b([^>]*)>([^<]*)/gi)].map(([, attributes, text]) => ({
    value: attributes.match(/\bvalue\s*=\s*"([^"]*)"/i)?.[1] ?? "",
    text: decodeHtmlText(text),
    treatment: attributes.match(/\bdata-treatment\s*=\s*"([^"]*)"/i)?.[1],
  }));
}

// Options the script adds to one dropdown, e.g. `{ value: 34757, text: '25mg (Low Dosage)' }`.
function appendedChoices(script: string): Choice[] {
  return [...script.matchAll(/value:\s*(\d+),\s*text:\s*'([^']*)'/g)].map(([, value, text]) => ({ value, text }));
}

// The strengths the script lists for each generic/branded choice.
function strengthsByAlternate(html: string) {
  const strengths = new Map<string, Choice[]>();
  for (const [, alternate, option] of html.matchAll(/ddlAlternate'\)\.val\(\)\s*==\s*(\d+)\)\s*\{\s*\$\('#\w*ddlTypes'\)\.append\(\$\('<option>',\s*\{([^}]*)\}/g)) {
    strengths.set(alternate, [...(strengths.get(alternate) ?? []), ...appendedChoices(option)]);
  }
  return strengths;
}

// The quantities the script swaps in for a strength that has its own list (daily tablets by month).
function quantitiesByStrength(html: string) {
  const quantities = new Map<string, Choice[]>();
  for (const [, strength, body] of html.matchAll(/ddlTypes'\)\.val\(\)\s*==\s*(\d+)\)\s*\{\s*\$\('#\w*ddlQuantity'\)\.empty\(\);([\s\S]*?)\};/g)) {
    quantities.set(strength, appendedChoices(body));
  }
  return quantities;
}

function priceBands(html: string) {
  const bands = new Map<string, Band[]>();
  for (const [, id, rows] of html.matchAll(/\bprices\[(\d+)\]\s*=\s*\[((?:\[[\d.,\s]+\],?\s*)+)\]/g)) {
    bands.set(id, [...rows.matchAll(/\[\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*(\d)\s*\]/g)].map(([, from, unitPrice, inStock]) => ({ from: Number(from), unitPrice: Number(unitPrice), inStock: inStock !== "0" })));
  }
  return bands;
}

// Each product on the page (its generic and branded choice, or the page's one product) with the
// strengths it comes in. A choice offering several strengths on a page with no strength dropdown
// (the generic side of a Viagra Connect page) can't be told apart, so it is left out.
function products(html: string, heading: string): { name: string; side: string; strengths: Choice[] }[] {
  const alternates = selectChoices(html, "ddlAlternate");
  const shownStrengths = selectChoices(html, "ddlTypes");
  if (alternates.length === 0) {
    const pageVariant = html.match(/<input\b[^>]*\bid\s*=\s*"\w*hfVarId"[^>]*>/i)?.[0].match(/\bvalue\s*=\s*"(\d+)"/i)?.[1];
    const own = pageVariant ? [{ value: pageVariant, text: "" }] : [];
    return [{ name: heading, side: "", strengths: shownStrengths.length > 0 ? shownStrengths : own }];
  }
  const listed = strengthsByAlternate(html);
  const seen = new Set<string>();
  return alternates.flatMap((alternate) => {
    const strengths = listed.get(alternate.value) ?? [];
    if (seen.has(alternate.value) || strengths.length === 0 || (shownStrengths.length === 0 && strengths.length > 1)) return [];
    seen.add(alternate.value);
    // "36 Hour"/"Daily" choices (no generic/branded marker) are the page's own product.
    return [{ name: alternate.treatment ? alternate.text : heading, side: alternate.treatment ?? "", strengths }];
  });
}

function priceCheckerLabels(html: string): PricedVariantLabel[] {
  const bands = priceBands(html);
  if (bands.size === 0) return [];
  // A promotion taken off the worked-out price changes what is shown; leave that to the page itself.
  if (Number(html.match(/\bvar discount\s*=\s*([\d.]+)/)?.[1] ?? 0) !== 0) return [];
  const heading = decodeHtmlText((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "").replace(/<[^>]+>/g, " "));
  const shownQuantities = selectChoices(html, "ddlQuantity");
  const ownQuantities = quantitiesByStrength(html);

  const labels: PricedVariantLabel[] = [];
  for (const product of products(html, heading)) {
    // A brand in brackets only describes the product ("Sildenafil (Generic Viagra Connect)").
    const name = product.name.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
    for (const strength of product.strengths) {
      const table = bands.get(strength.value);
      if (!name || !table) continue;
      for (const quantity of ownQuantities.get(strength.value) ?? shownQuantities) {
        const count = Number(quantity.value);
        const band = table.filter((row) => count >= row.from).at(-1);
        if (!band || !(count > 0)) continue;
        labels.push({
          productName: product.name,
          optionText: product.side,
          label: `${name} ${strength.text} ${quantity.text}`.replace(/\s+/g, " "),
          itemPricePence: Math.round(band.unitPrice * count * 100),
          availability: band.inStock ? "IN_STOCK" : "OUT_OF_STOCK",
        });
      }
    }
  }
  return labels;
}

export function pickPerTabletPriceTable(html: string, matchedTokens: string[], variant: VariantSpec, sourceUrl: string): ScrapedPrice | undefined {
  const matches = priceCheckerLabels(html)
    .filter((item) => brandSideMatches(item.productName, item.optionText, matchedTokens[0], variant.generic))
    .filter((item) => labelMatchesVariant(item.label, matchedTokens, variant));
  if (new Set(matches.map((match) => match.itemPricePence)).size !== 1) return undefined;
  return {
    itemPricePence: matches[0].itemPricePence,
    availability: matches[0].availability,
    evidence: matches[0].label,
    deliveryFeePence: 0,
    deliveryAssumption: "As shown on the provider's price checker at collection time",
    sourceUrl,
    source: "per-tablet-price-table",
  };
}
