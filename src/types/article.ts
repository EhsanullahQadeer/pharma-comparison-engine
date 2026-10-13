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
