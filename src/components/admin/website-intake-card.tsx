"use client";

import { Loader2, Plus } from "lucide-react";
import { useCallback, useState } from "react";

import { submitWebsiteForReview, type WebsiteIntakeState } from "@/actions/discovery/website-intake";
import { websiteIntakeSchema, type WebsiteIntakeValues } from "@/actions/discovery/website-intake-schema";
import { Button } from "@/components/common/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/card";
import FORM, { FormFeilds } from "@/components/common/form";
import InputField from "@/components/common/input";
import Link from "@/components/Link";

import type { FieldValues } from "react-hook-form";

// Staff found a pharmacy website themselves (e.g. an ordinary Google search): paste it here and it
// joins the review queue like any discovered candidate, with what its homepage showed.
export function WebsiteIntakeCard() {
  const [state, setState] = useState<WebsiteIntakeState & { pending: boolean }>({ pending: false });

  const handleSubmit = useCallback(async (values: FieldValues) => {
    setState({ pending: true });
    const result = await submitWebsiteForReview(values as WebsiteIntakeValues);
    setState({ pending: false, ...result });
    return result.result ? { status: 200 } : undefined;
  }, []);

  const { result } = state;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a website for review</CardTitle>
        <CardDescription>For a pharmacy you found yourself. We read its public homepage (respecting its robots rules) and add it to the review queue; nothing is promoted or published from here.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <FORM schema={websiteIntakeSchema} defaultValues={{ website: "" }} onSubmit={handleSubmit} className="flex-row flex-wrap items-end gap-3">
          <FormFeilds fieldProps={{ name: "website", className: "min-w-64 flex-1" }} label={{ text: "Website" }} required>
            {(field) => <InputField type="text" bare {...field} value={field.value ?? ""} inputMode="url" placeholder="example-pharmacy.co.uk" />}
          </FormFeilds>
          <Button type="submit" disabled={state.pending}>
            {state.pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Plus aria-hidden="true" className="size-4" />}
            Add for review
          </Button>
        </FORM>
        {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
        {result ? (
          <div role="status" className="rounded-lg border border-border p-3 text-sm">
            <p className="font-medium">{result.retried ? "Sent back to the review queue" : "Added to the review queue"}: {result.name} ({result.domain})</p>
            <p className="mt-1 text-muted-foreground">
              {result.blockedReason ? `Its homepage couldn't be read automatically (${result.blockedReason}), so check it in your browser when reviewing.` : "Its homepage was read."}
              {result.gphcNumber ? ` A GPhC number on the page: ${result.gphcNumber} — check it on the register.` : " No GPhC number was found on the homepage."}
            </p>
            <Link href="/admin/reviews" className="mt-1 inline-block underline underline-offset-4">Open the review queue</Link>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
