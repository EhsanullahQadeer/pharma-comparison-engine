import type { NormalizedCandidate } from "@/types/discovery";

export function homepageEvidence(html: string, candidate: NormalizedCandidate) {
  const text = html.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/\s+/g, " ");
  const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const identity = [candidate.gphcNumber, candidate.postcode].filter((value): value is string => Boolean(value));
  const nameMatches = compact(text).includes(compact(candidate.name));
  const identityMatches = identity.some(value => compact(text).includes(compact(value)));
  const deliveryEvidence = (text.match(/[^.!?]{0,100}\b(?:delivery|deliveries|shipping|deliver(?:ed)? to your (?:door|home))\b[^.!?]{0,100}/gi) ?? [])
    .filter(value => !/\b(?:no|not|unavailable|do not|don't|cannot|can't)\b/i.test(value)).slice(0, 8);
  const phones = [...new Set((html.match(/href\s*=\s*["']tel:([^"']+)/gi) ?? [])
    .map(value => value.replace(/^.*tel:/i, "").trim())
    .concat(text.match(/(?:\+44\s?\(?0?\)?|\b0)(?:[\s()-]*\d){9,10}\b/g) ?? []))];
  return { verifiedIdentity: nameMatches && identityMatches, deliveryEvidence, phones };
}
