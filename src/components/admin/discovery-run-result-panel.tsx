"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import type { DiscoveryRunResultCandidate } from "@/actions/discovery/discovery-sources";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import { TableViewPagination } from "@/components/common/table-view-pagination";
import Link from "@/components/Link";
import type { DiscoveryRunStatus, DiscoverySourceType } from "@/generated/prisma/client";
import { useTableView } from "@/hooks/useTableView";
import { identifierSummary } from "@/lib/discovery-identifier-summary";
import { discoveryCandidateStatusBadgeVariant, discoveryCandidateStatusLabels, discoveryRunStatusBadgeVariant, discoveryRunStatusLabels, discoverySourceTypeLabels } from "@/lib/discovery-labels";
import type { TableSorters } from "@/types/table";

export type DiscoveryRunResult = {
  status: DiscoveryRunStatus | null;
  candidatesFound: number;
  errorMessage: string | null;
  requestSummary: string | null;
  candidates: DiscoveryRunResultCandidate[];
};

type ViewMode = "table" | "json";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied by browser/permissions-policy — fail visibly rather than
      // an unhandled rejection, and let the user select the text below instead.
      setCopied(false);
      setFailed(true);
      setTimeout(() => setFailed(false), 2000);
    }
  }

  let buttonLabel = label;
  if (copied) buttonLabel = "Copied";
  if (failed) buttonLabel = "Couldn't copy — select text below";

  return (
    <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
      {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
      {buttonLabel}
    </Button>
  );
}

function RequestSummary({ summary }: { summary: string }) {
  return (
    <div className="space-y-1.5 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Endpoint queried — secrets shown as <code className="font-mono">{"{placeholder}"}</code>, never a real value
        </p>
        <CopyButton text={summary} label="Copy" />
      </div>
      <pre className="overflow-auto font-mono text-xs">{summary}</pre>
    </div>
  );
}

const sorters = {
  name: (candidate) => candidate.name,
  postcode: (candidate) => candidate.postcode,
  website: (candidate) => candidate.websiteDomain,
  status: (candidate) => discoveryCandidateStatusLabels[candidate.status],
} satisfies TableSorters<DiscoveryRunResultCandidate>;

function TableView({ candidates }: { candidates: DiscoveryRunResultCandidate[] }) {
  const view = useTableView(candidates, sorters);
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead {...view.sortProps("name")}>Name</TableHead>
            <TableHead {...view.sortProps("postcode")}>Postcode</TableHead>
            <TableHead {...view.sortProps("website")}>Website</TableHead>
            <TableHead>Registration no.</TableHead>
            <TableHead {...view.sortProps("status")}>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.rows.map((candidate) => (
            <TableRow key={candidate.id}>
              <TableCell className="font-medium">{candidate.name}</TableCell>
              <TableCell className="text-muted-foreground">{candidate.postcode ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{candidate.websiteDomain ?? "—"}</TableCell>
              <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{identifierSummary(candidate)}</TableCell>
              <TableCell>
                <Badge variant={discoveryCandidateStatusBadgeVariant[candidate.status]}>{discoveryCandidateStatusLabels[candidate.status]}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TableViewPagination pagination={view.pagination} className="px-(--card-spacing)" />
      <p className="px-4 pt-3 text-sm text-muted-foreground">
        <Link href="/admin/reviews" className="underline hover:no-underline">Review these in the Discovery candidates queue</Link>
      </p>
    </>
  );
}

function JsonView({ rawResponse }: { rawResponse: unknown[] }) {
  return (
    <pre className="max-h-128 overflow-auto rounded-lg bg-muted px-4 py-3 font-mono text-xs">
      {JSON.stringify(rawResponse, null, 2)}
    </pre>
  );
}

export function DiscoveryRunResultPanel({ sourceType, result }: { sourceType: DiscoverySourceType; result: DiscoveryRunResult }) {
  const [view, setView] = useState<ViewMode>("table");
  // Exactly what each adapter received from the source API for these candidates — not our
  // normalized columns — so staff can see the same shape they'd get calling the API directly.
  const rawResponse = result.candidates.map((candidate) => candidate.rawPayload);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Last run: {discoverySourceTypeLabels[sourceType]}
          {result.status ? <Badge variant={discoveryRunStatusBadgeVariant[result.status]}>{discoveryRunStatusLabels[result.status]}</Badge> : null}
          <span className="text-sm font-normal text-muted-foreground">
            {result.candidatesFound} candidate{result.candidatesFound === 1 ? "" : "s"} found
          </span>
        </CardTitle>
        {result.errorMessage ? <p className="text-sm text-destructive">{result.errorMessage}</p> : null}
        {result.requestSummary ? <RequestSummary summary={result.requestSummary} /> : null}
        {result.candidates.length > 0 ? (
          <div className="flex items-center gap-2 pt-1">
            <div className="inline-flex rounded-lg border border-border p-1">
              <Button type="button" size="sm" variant={view === "table" ? "secondary" : "ghost"} onClick={() => setView("table")}>Table</Button>
              <Button type="button" size="sm" variant={view === "json" ? "secondary" : "ghost"} onClick={() => setView("json")}>Raw JSON</Button>
            </div>
            {view === "json" ? <CopyButton text={JSON.stringify(rawResponse, null, 2)} label="Copy JSON" /> : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="px-0">
        {result.candidates.length === 0 ? <EmptyState title="This run found nothing new to review." /> : null}
        {result.candidates.length > 0 && view === "table" ? <TableView candidates={result.candidates} /> : null}
        {result.candidates.length > 0 && view === "json" ? <JsonView rawResponse={rawResponse} /> : null}
      </CardContent>
    </Card>
  );
}
