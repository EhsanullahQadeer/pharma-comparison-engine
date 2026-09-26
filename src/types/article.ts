// An ED article's content, as written by staff or shipped as sourced reference content.
// Sources are one per entry in "Title — https://…" form; the public view numbers them 1..n so a
// body can cite them inline as [[n]](#source-n).
export type ArticleContent = {
  slug: string;
  title: string;
  summary: string;
  keyFacts: string[];
  body: string;
  sources: string[];
};

// How a public article page was vetted: a named clinical reviewer, or checked against its cited
// sources only (while it waits for that review).
export type ArticleVetting =
  | { kind: "reviewed"; authorName: string; reviewerName: string | null; reviewedAt: Date | null; revision: number }
  | { kind: "sourced"; checkedOn: Date };
