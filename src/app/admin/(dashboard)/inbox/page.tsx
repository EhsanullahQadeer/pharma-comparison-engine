import { getPublicSubmissions } from "@/actions/submissions/public-submissions";
import { SubmissionStatusActions } from "@/components/admin/submission-status-actions";
import { Badge } from "@/components/common/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import Link from "@/components/Link";
import type { PublicSubmissionKind } from "@/generated/prisma/client";
import { publicSubmissionKindLabels, publicSubmissionKindValues, publicSubmissionStatusBadgeVariant, publicSubmissionStatusLabels } from "@/lib/content-labels";
import { cn } from "@/lib/utils";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Inbox", robots: { index: false, follow: false } };

const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

export default async function InboxPage(props: PageProps<"/admin/inbox">) {
  const { kind: kindParam } = await props.searchParams;
  const kind = publicSubmissionKindValues.find((value) => value === kindParam) as PublicSubmissionKind | undefined;
  const submissions = await getPublicSubmissions(kind);
  const filters = [{ href: "/admin/inbox", label: "All", active: !kind }, ...publicSubmissionKindValues.map((value) => ({ href: `/admin/inbox?kind=${value}`, label: publicSubmissionKindLabels[value], active: kind === value }))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pharmacy suggestions and contact messages from the public site. Listing corrections go to <Link href="/admin/reviews" className="underline underline-offset-4">Reviews</Link>.
        </p>
      </div>
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-sm text-muted-foreground">{submissions.length} message{submissions.length === 1 ? "" : "s"}</CardTitle>
          <nav aria-label="Filter messages" className="flex flex-wrap gap-1">
            {filters.map((filter) => (
              <Link key={filter.href} href={filter.href} aria-current={filter.active ? "page" : undefined} className={cn("rounded-full border px-3 py-1 text-xs transition-colors", filter.active ? "border-primary bg-primary font-medium text-primary-foreground" : "border-border hover:bg-muted")}>{filter.label}</Link>
            ))}
          </nav>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <EmptyState title="No messages yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ width: 160 }}>Received</TableHead>
                  <TableHead style={{ width: 170 }}>Type</TableHead>
                  <TableHead style={{ width: 200 }}>From</TableHead>
                  <TableHead style={{ width: 420 }}>Details</TableHead>
                  <TableHead style={{ width: 110 }}>Status</TableHead>
                  <TableHead className="text-right" style={{ width: 220 }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id} className="align-top">
                    <TableCell className="text-xs text-muted-foreground">{dateFormatter.format(submission.createdAt)}</TableCell>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
