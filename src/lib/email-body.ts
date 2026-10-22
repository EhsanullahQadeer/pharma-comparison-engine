// Plain-text and HTML versions of one short transactional email: paragraphs, one link, a footer.
// Every value is escaped for the HTML version.
const htmlEscapes: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => htmlEscapes[char]);

export function emailBody(paragraphs: string[], link: { url: string; label: string }, footer: string) {
  const text = [...paragraphs, `${link.label}: ${link.url}`, "", footer].join("\n\n");
  const html = [
    ...paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`),
    `<p><a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a></p>`,
    `<p style="color:#666;font-size:12px">${escapeHtml(footer)}</p>`,
  ].join("\n");
  return { text, html };
}
