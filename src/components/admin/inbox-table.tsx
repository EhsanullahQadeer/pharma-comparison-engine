"use client";

import type { getPublicSubmissions } from "@/actions/submissions/public-submissions";
import { SubmissionStatusActions } from "@/components/admin/submission-status-actions";
import { Badge } from "@/components/common/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { TableViewPagination } from "@/components/common/table-view-pagination";
import { useTableView } from "@/hooks/useTableView";
import { publicSubmissionKindLabels, publicSubmissionStatusBadgeVariant, publicSubmissionStatusLabels } from "@/lib/content-labels";
import type { TableSorters } from "@/types/table";

type Submission = Awaited<ReturnType<typeof getPublicSubmissions>>[number];

const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

const sorters = {
  received: (submission) => submission.createdAt,
  kind: (submission) => publicSubmissionKindLabels[submission.kind],
  from: (submission) => submission.name ?? submission.email,
  status: (submission) => publicSubmissionStatusLabels[submission.status],
} satisfies TableSorters<Submission>;

export function InboxTable({ submissions }: { submissions: Submission[] }) {
  const view = useTableView(submissions, sorters);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style={{ width: 160 }} {...view.sortProps("received")}>Received</TableHead>
            <TableHead style={{ width: 170 }} {...view.sortProps("kind")}>Type</TableHead>
            <TableHead style={{ width: 200 }} {...view.sortProps("from")}>From</TableHead>
            <TableHead style={{ width: 420 }}>Details</TableHead>
            <TableHead style={{ width: 110 }} {...view.sortProps("status")}>Status</TableHead>
            <TableHead className="text-right" style={{ width: 220 }}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.rows.map((submission) => (
            <TableRow key={submission.id} className="align-top">
              <TableCell className="text-xs text-muted-foreground">{dateFormatter.format(new Date(submission.createdAt))}</TableCell>
              <TableCell>{publicSubmissionKindLabels[submission.kind]}</TableCell>
              <TableCell className="text-sm whitespace-normal!">
                <p>{submission.name ?? "—"}</p>
                {submission.email ? <a href={`mailto:${submission.email}`} className="text-xs text-muted-foreground underline underline-offset-4">{submission.email}</a> : null}
              </TableCell>
              <TableCell className="text-sm whitespace-normal!">
                {submission.pharmacyName ? (
                  <p className="font-medium">
                    {submission.pharmacyName}
                    {submission.websiteUrl ? <> · <a href={submission.websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-normal underline underline-offset-4">{submission.websiteUrl}</a></> : null}
                    {submission.regulatorReference ? <span className="font-normal text-muted-foreground"> · Reg. {submission.regulatorReference}</span> : null}
                  </p>
                ) : null}
                {submission.subject ? <p className="text-xs font-medium text-muted-foreground uppercase">{submission.subject}</p> : null}
                <p className="mt-1 whitespace-pre-line text-muted-foreground">{submission.message}</p>
              </TableCell>
              <TableCell>
                <Badge variant={publicSubmissionStatusBadgeVariant[submission.status]}>{publicSubmissionStatusLabels[submission.status]}</Badge>
                {submission.handledBy ? <p className="mt-1 text-xs text-muted-foreground">{submission.handledBy.name}</p> : null}
              </TableCell>
              <TableCell><SubmissionStatusActions id={submission.id} status={submission.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TableViewPagination pagination={view.pagination} />
    </>
  );
}
