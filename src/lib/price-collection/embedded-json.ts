// Reads a JSON value a shop embeds in an inline script (`var BCData = {...}`, `const prices = [...]`).
// Scans from the marker to the matching closing bracket, skipping brackets inside strings, rather
// than trusting a regex to find where the literal ends.
export function extractEmbeddedJson(html: string, marker: RegExp): unknown {
  const at = html.search(marker);
  if (at < 0) return undefined;
  const start = html.slice(at).search(/[[{]/);
  if (start < 0) return undefined;
  const begin = at + start;
  const open = html[begin];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  for (let index = begin; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (char === "\\") index += 1;
      else if (char === "\"") inString = false;
    } else if (char === "\"") {
      inString = true;
    } else if (char === open) {
      depth += 1;
    } else if (char === close && --depth === 0) {
      try {
        return JSON.parse(html.slice(begin, index + 1));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}
