import type { DiscoveryRunResultCandidate } from "@/actions/discovery/discovery-sources";
import { Badge } from "@/components/common/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import Link from "@/components/Link";
import type { DiscoveryRunStatus, DiscoverySourceType } from "@/generated/prisma/client";
import { identifierSummary } from "@/lib/discovery-identifier-summary";
import { discoveryCandidateStatusBadgeVariant, discoveryCandidateStatusLabels, discoveryRunStatusBadgeVariant, discoveryRunStatusLabels, discoverySourceTypeLabels } from "@/lib/discovery-labels";

export type DiscoveryRunResult = {
  status: DiscoveryRunStatus | null;
  candidatesFound: number;
  errorMessage: string | null;
  candidates: DiscoveryRunResultCandidate[];
};

export function DiscoveryRunResultPanel({ sourceType, result }: { sourceType: DiscoverySourceType; result: DiscoveryRunResult }) {
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
      </CardHeader>
      <CardContent className="px-0">
        {result.candidates.length === 0 ? (
          <EmptyState title="This run found nothing new to review." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Postcode</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Registration no.</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.candidates.map((candidate) => (
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
            <p className="px-4 pt-3 text-sm text-muted-foreground">
              <Link href="/admin/reviews" className="underline hover:no-underline">Review these in the Discovery candidates queue</Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
