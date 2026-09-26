// Inline citation for article markdown: cite(2) → "[[2]](#source-2)", which the public article view
// renders as a superscript link to the 2nd entry of the article's numbered source list.
export const cite = (...numbers: number[]) => numbers.map((n) => `[[${n}]](#source-${n})`).join("");
