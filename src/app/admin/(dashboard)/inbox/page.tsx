import { getPublicSubmissions } from "@/actions/submissions/public-submissions";
import { InboxTable } from "@/components/admin/inbox-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import Link from "@/components/Link";
import type { PublicSubmissionKind } from "@/generated/prisma/client";
import { publicSubmissionKindLabels, publicSubmissionKindValues } from "@/lib/content-labels";
import { cn } from "@/lib/utils";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Inbox", robots: { index: false, follow: false } };

export default async function InboxPage(props: PageProps<"/admin/inbox">) {
  const { kind: kindParam } = await props.searchParams;
  const kind = publicSubmissionKindValues.find((value) => value === kindParam) as PublicSubmissionKind | undefined;
  const submissions = await getPublicSubmissions(kind);
  const filters = [{ href: "/admin/inbox", label: "All", active: !kind }, ...publicSubmissionKindValues.map((value) => ({ href: `/admin/inbox?kind=${value}`, label: publicSubmissionKindLabels[value], active: kind === value }))];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pharmacy suggestions and contact messages from the public site. Listing corrections go to <Link href="/admin/reviews" className="underline underline-offset-4">Reviews</Link>.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
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
            <InboxTable submissions={submissions} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
