"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/common/button";
import { cn } from "@/lib/utils";

// A discount code shown as a dashed "ticket" that copies itself on click. The code stays visible
// as plain text, so it's usable without JavaScript or clipboard permission.
export function CopyCodeButton({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions/insecure context) — the code is still on screen to copy by hand.
    }
  }

  return (
    <Button type="button" variant="outline" onClick={handleCopy} className={cn("h-auto gap-2 rounded-xl border-2 border-dashed border-primary/60 px-3 py-1.5 font-mono text-sm font-semibold tracking-wider", className)}>
      {code}
      {copied ? <Check aria-hidden="true" className="size-4 text-primary" /> : <Copy aria-hidden="true" className="size-4" />}
      <span className="sr-only" aria-live="polite">{copied ? "Copied" : "Copy code"}</span>
    </Button>
  );
}
