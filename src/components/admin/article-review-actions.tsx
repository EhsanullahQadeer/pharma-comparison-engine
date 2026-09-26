"use client";

import { CheckCircle2, EyeOff, Send, Undo2 } from "lucide-react";
import { useState, useTransition } from "react";

import { reviewArticle, submitArticleForReview, unpublishArticle } from "@/actions/articles/articles";
import type { ArticleActionState } from "@/actions/articles/articles";
import { Button } from "@/components/common/button";
import InputField from "@/components/common/input";
import type { ArticleStatus } from "@/generated/prisma/client";
import { confirm } from "@/lib/confirm-store";

import type { ReactNode } from "react";

// Workflow controls for one article. What's offered depends on its status; the server enforces the
// same rules (including "a reviewer can't approve their own article").
export function ArticleReviewActions({ id, status, isAuthor, reviewNotes }: { id: string; status: ArticleStatus; isAuthor: boolean; reviewNotes: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [notes, setNotes] = useState("");

  const run = (action: () => Promise<ArticleActionState>) => startTransition(async () => {
    const result = await action();
    setError(result.error);
  });

  async function handleUnpublish() {
    const ok = await confirm({ title: "Take this article off the site?", message: "It goes back to draft and disappears from the public page until it's reviewed and approved again.", confirmText: "Unpublish", variant: "destructive" });
    if (ok) run(() => unpublishArticle(id));
  }

  const panels: Record<ArticleStatus, () => ReactNode> = {
    DRAFT: () => (
      <>
        {reviewNotes ? <p className="rounded-lg border border-border bg-muted/50 p-3 text-sm"><span className="font-medium">Reviewer&apos;s notes: </span>{reviewNotes}</p> : null}
        <p className="text-sm text-muted-foreground">When the draft is ready, send it to a clinical reviewer. It stays off the public site until they approve it.</p>
        <Button type="button" disabled={isPending} onClick={() => run(() => submitArticleForReview(id))}><Send aria-hidden="true" className="size-4" />Send for review</Button>
      </>
    ),
    IN_REVIEW: () => (
      isAuthor ? (
        <p className="text-sm text-muted-foreground">Waiting for a clinical reviewer. You wrote this article, so a different reviewer has to approve it.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Check the article against its sources, safety wording and signposting. Approving publishes it with your name as the clinical reviewer.</p>
          <InputField type="textarea" label="Notes for the author (if returning)" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={isPending} onClick={() => run(() => reviewArticle(id, "approve"))}><CheckCircle2 aria-hidden="true" className="size-4" />Approve and publish</Button>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => run(() => reviewArticle(id, "return", notes))}><Undo2 aria-hidden="true" className="size-4" />Return to author</Button>
          </div>
        </>
      )
    ),
    PUBLISHED: () => (
      <>
        <p className="text-sm text-muted-foreground">This article is live on the public site.</p>
        <Button type="button" variant="outline" disabled={isPending} onClick={handleUnpublish}><EyeOff aria-hidden="true" className="size-4" />Unpublish</Button>
      </>
    ),
  };

  return (
    <div className="flex flex-col items-start gap-3">
      {panels[status]()}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
