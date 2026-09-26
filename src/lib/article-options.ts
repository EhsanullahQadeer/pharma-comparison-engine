import { articlePages } from "@/lib/ed-pages";

// Article-page choices for the editor: pages that don't have an article yet, plus the article's own.
export function articleSlugOptions(takenSlugs: string[], currentSlug?: string) {
  const taken = new Set(takenSlugs.filter((slug) => slug !== currentSlug));
  return articlePages.filter((page) => !taken.has(page.path)).map((page) => ({ value: page.path, label: `${page.title} (/ed/${page.path})` }));
}
