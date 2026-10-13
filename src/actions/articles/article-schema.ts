import { z } from "zod";

import { articlePages } from "@/lib/ed-pages";
import { untrustedSources } from "@/lib/trusted-sources";

// Plain module (not "use server") so the admin editor validates with the exact same rules the
// server re-applies. Multi-value fields are edited as one-per-line text.
const articleSlugs = articlePages.map((entry) => entry.path) as [string, ...string[]];

const lines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);

export const articleFormSchema = z.object({
  slug: z.enum(articleSlugs, { error: "Choose which page this article is for." }),
  title: z.string().trim().min(5, "Give the article a title."),
  summary: z.string().trim().min(20, "Write a one- or two-sentence summary.").max(400, "Keep the summary under 400 characters."),
  keyFacts: z.string().refine((value) => lines(value).length <= 6, "Up to 6 key facts, one per line."),
  body: z.string().trim().min(200, "The article body needs at least a few paragraphs."),
  sources: z.string()
    .refine((value) => lines(value).length > 0, "Add at least one source, one per line.")
    .superRefine((value, ctx) => {
      const [refused] = untrustedSources(lines(value));
      if (refused) ctx.addIssue({ code: "custom", message: `Every source needs a link to a trusted medical source. Not accepted: ${refused}` });
    }),
});

export type ArticleFormValues = z.infer<typeof articleFormSchema>;

export function toArticleData(values: ArticleFormValues) {
  return { slug: values.slug, title: values.title, summary: values.summary, body: values.body, keyFacts: lines(values.keyFacts), sources: lines(values.sources) };
}
