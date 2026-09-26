import { Handshake } from "lucide-react";

import { toProgrammeFormValues } from "@/actions/referrals/programme-schema";
import { AffiliateProgrammeFormModal } from "@/components/admin/affiliate-programme-form-modal";
import { AffiliateProgrammeStatusControl } from "@/components/admin/affiliate-programme-status-control";
import { Badge } from "@/components/common/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import type { AffiliateProgramme } from "@/generated/prisma/client";
import { buildTrackedUrl } from "@/lib/affiliate-links";
import { affiliateNetworkLabels, affiliateProgrammeStatusBadgeVariant, affiliateProgrammeStatusLabels, formatCommission } from "@/lib/referral-labels";

const SAMPLE_CLICK_REF = "CLICK-ID";

// A pharmacy's affiliate programme on its admin page. Everyone can read it; only commercial
// managers and administrators get the controls (the actions re-check the role anyway).
export function AffiliateProgrammeCard({ providerId, providerName, programme, sampleUrl, canEdit }: {
  providerId: string;
  providerName: string;
  programme: AffiliateProgramme | null;
  // One of the pharmacy's own product pages, to preview the tracked link.
  sampleUrl: string | null;
  canEdit: boolean;
}) {
  const formModal = canEdit
    ? <AffiliateProgrammeFormModal providerId={providerId} providerName={providerName} defaultValues={toProgrammeFormValues(programme)} isNew={!programme} />
    : null;

  if (!programme) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Affiliate programme</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Handshake}
            title="No programme recorded"
            description="Add one once this pharmacy's affiliate programme has accepted us. Until a programme is active, clicks go to the plain product page."
            action={formModal}
          />
        </CardContent>
      </Card>
    );
  }

  const details = [
    { label: "Network", value: `${affiliateNetworkLabels[programme.network]}${programme.networkMerchantId ? ` · ID ${programme.networkMerchantId}` : ""}` },
    { label: "Commission", value: formatCommission(programme.commissionBasis, programme.commissionValue) },
    { label: "Attribution window", value: programme.attributionDays ? `${programme.attributionDays} days` : "Not recorded" },
    { label: "Prescription medicines permitted", value: programme.pomPromotionPermitted ? "Yes, per the terms" : "Not confirmed" },
    { label: "Active since", value: programme.activatedAt ? programme.activatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Never activated" },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CardTitle>Affiliate programme</CardTitle>
          <Badge variant={affiliateProgrammeStatusBadgeVariant[programme.status]}>{affiliateProgrammeStatusLabels[programme.status]}</Badge>
        </div>
        {formModal}
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {details.map((detail) => (
            <div key={detail.label}>
              <dt className="text-xs text-muted-foreground">{detail.label}</dt>
              <dd className="font-medium">{detail.value}</dd>
            </div>
          ))}
          <div>
            <dt className="text-xs text-muted-foreground">Terms</dt>
            <dd className="font-medium">
              {programme.termsUrl ? <a href={programme.termsUrl} target="_blank" rel="noopener noreferrer" className="break-all text-primary hover:underline">{programme.termsUrl}</a> : "No link recorded"}
            </dd>
          </div>
        </dl>
        {programme.termsNotes ? <p className="text-sm whitespace-pre-line text-muted-foreground">{programme.termsNotes}</p> : null}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Example tracked link{sampleUrl ? "" : " (sample product page)"}</p>
          <p className="rounded-lg border border-border bg-muted/40 p-2 font-mono text-xs break-all">
            {buildTrackedUrl(programme.linkTemplate, sampleUrl ?? "https://example.com/product", SAMPLE_CLICK_REF)}
          </p>
        </div>
        {canEdit ? (
          <div className="border-t border-border pt-4">
            <AffiliateProgrammeStatusControl key={programme.status} providerId={providerId} status={programme.status} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
