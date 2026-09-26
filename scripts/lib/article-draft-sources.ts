import type { ArticleContent } from "../../src/types/article";

export type ArticleDraft = ArticleContent;

// Hidden note for the clinical reviewer. HTML comments stay in the editor's source but are never
// rendered on the public page (the markdown renderer drops raw HTML).
export const reviewerNote = (text: string) => `<!-- REVIEWER: ${text} -->`;
