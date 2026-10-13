"use client";

import { EyeOff, Power, PowerOff, Send } from "lucide-react";
import { useState, useTransition } from "react";

import { publishArticle, setArticleActive, unpublishArticle } from "@/actions/articles/articles";
import type { ArticleActionState } from "@/actions/articles/articles";
import { Button } from "@/components/common/button";
import { confirm } from "@/lib/confirm-store";
import { cn } from "@/lib/utils";

// Publish / unpublish and activate / deactivate for one article. The server enforces the same rules
// (role, trusted sources). `compact` is the table-row form: small buttons, no explanatory text.
export function ArticlePublishActions({ id, published, active, compact = false }: { id: string; published: boolean; active: boolean; compact?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const size = compact ? "sm" : "default";

  const run = (action: () => Promise<ArticleActionState>) => startTransition(async () => {
    const result = await action();
    setError(result.error);
  });

  async function handleUnpublish() {
    const ok = await confirm({ title: "Take this article off the site?", message: "It goes back to draft and the public page stops showing this version until you publish it again.", confirmText: "Unpublish", variant: "destructive" });
    if (ok) run(() => unpublishArticle(id));
  }

  async function handleDeactivate() {
    const ok = await confirm({ title: "Deactivate this article?", message: "It stays as it is here, but the public page stops showing it until you activate it again.", confirmText: "Deactivate", variant: "destructive" });
    if (ok) run(() => setArticleActive(id, false));
  }

  const publishButton = published
    ? <Button type="button" size={size} variant="outline" disabled={isPending} onClick={handleUnpublish}><EyeOff aria-hidden="true" className="size-4" />Unpublish</Button>
    : <Button type="button" size={size} disabled={isPending} onClick={() => run(() => publishArticle(id))}><Send aria-hidden="true" className="size-4" />Publish</Button>;
  const activeButton = active
    ? <Button type="button" size={size} variant="outline" disabled={isPending} onClick={handleDeactivate}><PowerOff aria-hidden="true" className="size-4" />Deactivate</Button>
    : <Button type="button" size={size} variant="outline" disabled={isPending} onClick={() => run(() => setArticleActive(id, true))}><Power aria-hidden="true" className="size-4" />Activate</Button>;

  return (
    <div className={cn("flex flex-col", compact ? "items-end gap-1" : "items-start gap-3")}>
      {compact ? null : (
        <p className="text-sm text-muted-foreground">
          {published ? "This article is published." : "Publishing puts this article on the public site with its list of sources. Every source must link to a trusted medical source."}
          {" "}
          {active ? "It is active, so the public site shows it once published." : "It is inactive, so the public site does not show it even when published."}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {publishButton}
        {activeButton}
      </div>
      {error ? <p role="alert" className={cn("text-sm text-destructive", compact && "max-w-56 text-right text-xs whitespace-normal")}>{error}</p> : null}
    </div>
  );
}
