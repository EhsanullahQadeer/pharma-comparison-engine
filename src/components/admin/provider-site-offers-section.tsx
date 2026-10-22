"use client";

import { AppWindow, ExternalLink, RefreshCw } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";

import type { SiteOfferDecision, SiteOffersState } from "@/actions/price-collection/site-offers";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { MutateButton } from "@/components/common/mutate-button";
import type { ScrapeReviewStatus } from "@/generated/prisma/client";
import { useMutate } from "@/hooks/useMutate";
import { discountHeadline } from "@/lib/discounts";
import { describeDeliveryPolicy } from "@/lib/price-collection/delivery-policy";
import { scrapeReviewStatusBadgeVariant, scrapeReviewStatusLabels } from "@/lib/review-labels";
import type { ProviderSiteOffers } from "@/types/pricing";

type ReviewAction = "reviewDeliveryPolicy" | "reviewScrapedDiscount";

type Finding = {
  id: string;
  status: ScrapeReviewStatus;
  title: string;
  detail?: string;
  evidenceText: string | null;
  sourceUrl: string | null;
  lastSeenAt: Date | null;
};

const dismissCopy: Record<Exclude<ScrapeReviewStatus, "DISMISSED">, { label: string; message: string }> = {
  PENDING: { label: "Dismiss", message: "Dismiss this suggestion? It won't be suggested again unless the website changes." },
  APPROVED: { label: "Remove", message: "Remove this from the pharmacy? It will stop being used and won't be suggested again unless the website changes." },
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-GB");
}

function ReviewActions({ action, finding, onResult }: { action: ReviewAction; finding: Finding; onResult: (error?: string) => void }) {
  const approveArgs = useMemo<[string, SiteOfferDecision]>(() => [finding.id, "APPROVED"], [finding.id]);
  const dismissArgs = useMemo<[string, SiteOfferDecision]>(() => [finding.id, "DISMISSED"], [finding.id]);
  const handleSuccess = useCallback((state: SiteOffersState) => onResult(state.error), [onResult]);
  const handleError = useCallback((error: Error) => onResult(error.message), [onResult]);
  if (finding.status === "DISMISSED") return null;
  const dismiss = dismissCopy[finding.status];

  return (
    <div className="flex shrink-0 gap-1">
      {finding.status === "PENDING" && (
        <MutateButton action={action} args={approveArgs} onSuccess={handleSuccess} onError={handleError}>
          <Button type="button" size="sm">Approve</Button>
        </MutateButton>
      )}
      <MutateButton action={action} args={dismissArgs} onSuccess={handleSuccess} onError={handleError} confirmMessage={dismiss.message} confirmText={dismiss.label} confirmVariant="destructive">
        <Button type="button" size="sm" variant="outline">{dismiss.label}</Button>
      </MutateButton>
    </div>
  );
}

function FindingRow({ action, finding, checkedAt, canReview, onResult }: { action: ReviewAction; finding: Finding; checkedAt: Date | null; canReview: boolean; onResult: (error?: string) => void }) {
  // Found on an earlier check but not on the latest one — the pharmacy may have withdrawn it.
  const missing = !!checkedAt && !!finding.lastSeenAt && new Date(finding.lastSeenAt) < new Date(checkedAt);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-1.5 text-sm">
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{finding.title}</p>
          <Badge variant={scrapeReviewStatusBadgeVariant[finding.status]}>{scrapeReviewStatusLabels[finding.status]}</Badge>
          {missing ? <Badge variant="destructive">Not found on the last check</Badge> : null}
        </div>
        {finding.detail ? <p className="text-xs text-muted-foreground">{finding.detail}</p> : null}
        <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          {finding.evidenceText ? <span>Website wording: “{finding.evidenceText}”</span> : null}
          {finding.sourceUrl ? (
            <a href={finding.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              <ExternalLink aria-hidden="true" className="size-3" />
              Open the page it was read from
            </a>
          ) : null}
          {finding.lastSeenAt ? <span>Last seen {formatDate(finding.lastSeenAt)}</span> : null}
        </p>
      </div>
      {canReview ? <ReviewActions action={action} finding={finding} onResult={onResult} /> : null}
    </li>
  );
}

function FindingList({ heading, empty, children }: { heading: string; empty: string; children: ReactNode[] }) {
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-medium text-muted-foreground">{heading}</h3>
      {children.length > 0 ? <ul className="space-y-1">{children}</ul> : <p className="text-xs text-muted-foreground">{empty}</p>}
    </div>
  );
}

function deliveryCheckMessage(result: NonNullable<SiteOffersState["result"]>) {
  if (!result.deliveryFound) return "No delivery charge could be read from the website.";
  return result.newDeliveryPolicy ? "Found a new delivery charge to review." : "The delivery charge is unchanged.";
}

export function ProviderSiteOffersSection({ providerId, siteOffers, canReview }: { providerId: string; siteOffers: ProviderSiteOffers; canReview: boolean }) {
  const [reviewError, setReviewError] = useState<string>();
  // Which of the two buttons started the running check, so only that one says "Checking…".
  const [checkingInChrome, setCheckingInChrome] = useState(false);
  const check = useMutate("checkProviderSiteOffers");
  const result = check.data?.result;
  const { mutate: runCheck } = check;
  const startCheck = useCallback((inChrome: boolean) => {
    setCheckingInChrome(inChrome);
    runCheck(providerId, inChrome);
  }, [runCheck, providerId]);

  const deliveryFindings = useMemo<Finding[]>(
    () => siteOffers.deliveryPolicies.map((policy) => ({ id: policy.id, status: policy.status, title: describeDeliveryPolicy(policy), evidenceText: policy.evidenceText, sourceUrl: policy.sourceUrl, lastSeenAt: policy.lastSeenAt })),
    [siteOffers.deliveryPolicies],
  );
  const discountFindings = useMemo<Finding[]>(
    () => siteOffers.discounts.map((discount) => ({
      id: discount.id,
      status: discount.status,
      title: discount.code ? `${discountHeadline(discount)} with code ${discount.code}` : discountHeadline(discount),
      detail: `Who qualifies: ${discount.eligibility}`,
      evidenceText: discount.evidenceText,
      sourceUrl: discount.sourceUrl,
      lastSeenAt: discount.lastSeenAt,
    })),
    [siteOffers.discounts],
  );

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-64">
          <CardTitle>Delivery charge and discounts from the website</CardTitle>
          <p className="text-xs text-muted-foreground">
            Read from the pharmacy&apos;s own website. Nothing here is used or shown publicly until it is approved.{" "}
            {siteOffers.checkedAt ? `Last checked ${formatDate(siteOffers.checkedAt)}.` : "Not checked yet."}
          </p>
        </div>
        {canReview ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={check.isPending} onClick={() => startCheck(false)}>
              <RefreshCw aria-hidden="true" className={check.isPending && !checkingInChrome ? "size-3.5 animate-spin" : "size-3.5"} />
              {check.isPending && !checkingInChrome ? "Checking…" : "Check website now"}
            </Button>
            {/* For a website behind a security check: you complete the check in the Chrome window that opens. */}
            <Button type="button" size="sm" variant="outline" disabled={check.isPending} onClick={() => startCheck(true)} title="Opens the website in the Chrome window. Complete any security check there yourself; the check waits up to five minutes per page.">
              <AppWindow aria-hidden="true" className={check.isPending && checkingInChrome ? "size-3.5 animate-pulse" : "size-3.5"} />
              {check.isPending && checkingInChrome ? "Waiting for Chrome…" : "Check in Chrome window"}
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {check.data?.error ? <p className="text-sm text-destructive">{check.data.error}</p> : null}
        {reviewError ? <p className="text-sm text-destructive">{reviewError}</p> : null}
        {result ? (
          <p className="text-sm text-muted-foreground">
            {deliveryCheckMessage(result)}{" "}
            {result.newDiscounts > 0 ? `Found ${result.newDiscounts} new discount${result.newDiscounts === 1 ? "" : "s"} to review.` : "No new discounts found."}
          </p>
        ) : null}
        <FindingList heading="Delivery charge" empty="No delivery charge on record from the website.">
          {deliveryFindings.map((finding) => (
            <FindingRow key={finding.id} action="reviewDeliveryPolicy" finding={finding} checkedAt={siteOffers.checkedAt} canReview={canReview} onResult={setReviewError} />
          ))}
        </FindingList>
        <FindingList heading="Discount offers" empty="No discount offers on record from the website.">
          {discountFindings.map((finding) => (
            <FindingRow key={finding.id} action="reviewScrapedDiscount" finding={finding} checkedAt={siteOffers.checkedAt} canReview={canReview} onResult={setReviewError} />
          ))}
        </FindingList>
      </CardContent>
    </Card>
  );
}
