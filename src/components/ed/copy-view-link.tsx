"use client";

import { Check, Link2 } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/common/button";

// The grid's whole state is in the URL, so the current address is a link to exactly this view —
// handy for sharing a particular product, pack and sort in a post or message.
export function CopyViewLink() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, []);
  return (
    <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={copy}>
      {copied ? <Check aria-hidden="true" className="size-4" /> : <Link2 aria-hidden="true" className="size-4" />}
      <span aria-live="polite">{copied ? "Link copied" : "Copy link to this view"}</span>
    </Button>
  );
}
