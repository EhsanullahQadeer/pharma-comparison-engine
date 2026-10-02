// ChatGPT can decorate linked text with an external-link arrow in innerText.
// The arrow is presentation, not part of the JSON response or URL.
export function normalizeChatgptDisplayText(text: string): string {
  return text.replace(/\s*↗/g, "").replace(/[\u200b-\u200d\ufeff]/g, "");
}

function normalizeJsonStringLineBreaks(text: string): string {
  let inString = false;
  let escaped = false;
  let output = "";
  for (const character of text) {
    if (inString && (character === "\r" || character === "\n")) {
      output += " ";
      continue;
    }
    output += character;
    if (escaped) escaped = false;
    else if (character === "\\" && inString) escaped = true;
    else if (character === '"') inString = !inString;
  }
  return output;
}

export function decisionJsonInPage(text: string, gphcNumber: string): string {
  const visibleText = normalizeChatgptDisplayText(text);
  const starts = [...visibleText.matchAll(/\{\s*"gphcNumber"\s*:/g)].map(match => match.index);
  for (const start of starts.reverse()) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < visibleText.length; index++) {
      const character = visibleText[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
      } else if (character === '"') inString = true;
      else if (character === "{") depth++;
      else if (character === "}" && --depth === 0) {
        const json = normalizeJsonStringLineBreaks(visibleText.slice(start, index + 1));
        try {
          const value = JSON.parse(json) as { gphcNumber?: string; status?: string };
          if (value.gphcNumber === gphcNumber && ["ACCEPTED", "REJECTED", "NEEDS_REVIEW"].includes(value.status ?? "")) return json;
        } catch {
          // Return the matching completed object so the caller reports a parse error,
          // rather than waiting ten minutes on a visibly finished response.
          if (json.includes(`"gphcNumber":"${gphcNumber}"`) && /"status"\s*:\s*"(?:ACCEPTED|REJECTED|NEEDS_REVIEW)"/.test(json)) return json;
        }
        break;
      }
    }
  }
  return "";
}
