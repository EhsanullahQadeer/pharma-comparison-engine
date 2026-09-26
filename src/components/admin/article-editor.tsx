"use client";

import { Eye, Loader2, Pencil, Save } from "lucide-react";
import { useCallback, useState } from "react";
import { useWatch } from "react-hook-form";

import { articleFormSchema } from "@/actions/articles/article-schema";
import type { ArticleFormValues } from "@/actions/articles/article-schema";
import { saveArticle } from "@/actions/articles/articles";
import { Button } from "@/components/common/button";
import FORM, { FormFeilds } from "@/components/common/form";
import InputField from "@/components/common/input";
import { ArticleMarkdown } from "@/components/ed/article-markdown";
import { useRouter } from "@/hooks/useRouter";
import { cn } from "@/lib/utils";

import type { FieldValues } from "react-hook-form";

const BODY_HINT = "Markdown: ## for section headings, - for bullet lists, | tables |, [link text](https://…). Raw HTML is ignored.";

// Live preview of the body using the exact public renderer, so authors and reviewers see what readers will.
function BodyPreview() {
  const body = useWatch({ name: "body" }) as string | undefined;
  return (
    <div className="min-h-96 rounded-lg border border-border bg-background p-5">
      {body?.trim() ? <ArticleMarkdown>{body}</ArticleMarkdown> : <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>}
    </div>
  );
}

export function ArticleEditor({ id, defaultValues, slugOptions, locked }: {
  id: string | null;
  defaultValues: ArticleFormValues;
  slugOptions: { value: string; label: string }[];
  // Published articles can still be edited, but saving creates a new revision that needs review again.
  locked?: boolean;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState(false);
  const [state, setState] = useState<{ pending: boolean; error?: string; saved?: boolean }>({ pending: false });

  const handleSubmit = useCallback(async (values: FieldValues) => {
    setState({ pending: true });
    const result = await saveArticle(id, values as ArticleFormValues);
    setState({ pending: false, error: result.error, saved: !result.error });
    if (!id && result.id) router.push(`/admin/articles/${result.id}`);
    else router.refresh();
  }, [id, router]);

  return (
    <FORM schema={articleFormSchema} defaultValues={defaultValues} onSubmit={handleSubmit} className="gap-5">
      {locked ? <p className="rounded-lg border border-border bg-muted/50 p-3 text-sm">This article is published. Saving changes creates a new revision, takes it off the public site and sends it back for clinical review.</p> : null}
      <div className="grid gap-5 lg:grid-cols-2">
        <FormFeilds fieldProps={{ name: "slug" }} label={{ text: "Public page" }} required>
          {(field) => <InputField type="select" bare id={field.id} name={field.name} value={field.value ?? ""} onChange={field.onChange} options={slugOptions} placeholder="Choose the page this article is for" />}
        </FormFeilds>
        <FormFeilds fieldProps={{ name: "title" }} label={{ text: "Title" }} required>
          {(field) => <InputField type="text" bare {...field} value={field.value ?? ""} />}
        </FormFeilds>
      </div>
      <FormFeilds fieldProps={{ name: "summary" }} label={{ text: "Summary (shown under the title and on hub cards)" }} required>
        {(field) => <InputField type="textarea" bare {...field} value={field.value ?? ""} rows={2} />}
      </FormFeilds>
      <FormFeilds fieldProps={{ name: "keyFacts" }} label={{ text: "Key facts (one per line, up to 6)" }}>
        {(field) => <InputField type="textarea" bare {...field} value={field.value ?? ""} rows={4} />}
      </FormFeilds>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Body <span className="text-destructive">*</span></p>
          <div className="inline-flex rounded-lg border border-border p-0.5 text-xs">
            {[{ value: false, label: "Edit", icon: Pencil }, { value: true, label: "Preview", icon: Eye }].map(({ value, label, icon: Icon }) => (
              <button key={label} type="button" onClick={() => setPreview(value)} aria-pressed={preview === value} className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors", preview === value ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground")}>
                <Icon aria-hidden="true" className="size-3.5" />{label}
              </button>
            ))}
          </div>
        </div>
        {preview ? <BodyPreview /> : (
          <FormFeilds fieldProps={{ name: "body" }}>
            {(field) => <InputField type="textarea" bare {...field} value={field.value ?? ""} rows={22} inputClassName="font-mono text-sm" />}
          </FormFeilds>
        )}
        <p className="text-xs text-muted-foreground">{BODY_HINT}</p>
      </div>
      <FormFeilds fieldProps={{ name: "sources" }} label={{ text: "Sources (one per line: Title — https://…)" }} required>
        {(field) => <InputField type="textarea" bare {...field} value={field.value ?? ""} rows={5} inputClassName="font-mono text-sm" />}
      </FormFeilds>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
        {state.saved ? <p role="status" className="text-sm text-muted-foreground">Saved.</p> : null}
        <Button type="submit" disabled={state.pending}>
          {state.pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}
          {id ? "Save changes" : "Create draft"}
        </Button>
      </div>
    </FORM>
  );
}
