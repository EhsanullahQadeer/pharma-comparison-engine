"use client";

import { Pencil } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  linkDiscoveryCandidateToProvider,
  linkDiscoveryCandidatesToProvidersBulk,
  promoteDiscoveryCandidatesBulk,
  rejectDiscoveryCandidate,
  rejectDiscoveryCandidatesBulk,
  type PromoteDiscoveryCandidateRow,
} from "@/actions/discovery/discovery-candidates";
import { DiscoveryCandidateEdCheckActions } from "@/components/admin/discovery-candidate-ed-check-actions";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/common/card";
import { Checkbox } from "@/components/common/checkbox";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import Pagination from "@/components/common/pagination";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import type { DiscoverySourceType, RegulatorType } from "@/generated/prisma/client";
import { identifierSummary } from "@/lib/discovery-identifier-summary";
import { discoverySourceTypeLabels, readEdFilterAudit } from "@/lib/discovery-labels";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { regulatorTypeLabels, regulatorTypeValues, serviceRegionOptions } from "@/lib/provider-labels";
import { cn } from "@/lib/utils";
import type { EdFilterAudit } from "@/types/discovery";

type CandidateItem = {
  id: string;
  name: string;
  postcode: string | null;
  websiteDomain: string | null;
  companyNumber: string | null;
  cqcLocationId: string | null;
  odsCode: string | null;
  gphcNumber: string | null;
  rawPayload: unknown;
  source: { type: DiscoverySourceType };
  matchedProvider: { id: string; tradingName: string } | null;
};

type PromoteDraft = {
  legalName: string;
  tradingName: string;
  websiteDomain: string;
  regulatorType: RegulatorType;
  regulatorReference: string;
  dispensingPartnerName: string;
  serviceRegions: string;
};

function defaultDraft(item: CandidateItem): PromoteDraft {
  return {
    legalName: item.name,
    tradingName: item.name,
    websiteDomain: item.websiteDomain ?? "",
    regulatorType: "GPHC",
    regulatorReference: item.gphcNumber ?? "",
    dispensingPartnerName: "",
    serviceRegions: "England",
  };
}

const selectClassName = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

// Shared "display mode" chrome for every editable cell below: plain text with a pencil that only
// appears on hover, clicking (the text or the icon) enters edit mode. One shell so all seven
// draft-backed columns look and behave the same at rest, even though what they switch into differs
// (a text Input, a native select, or a checkbox group).
function EditableDisplay({
  value,
  ariaLabel,
  placeholder,
  onClick,
}: {
  value: string;
  ariaLabel: string;
  placeholder?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/editable flex h-8 w-full items-center justify-between gap-1 rounded-lg px-2.5 text-start text-sm hover:bg-muted/50"
      aria-label={`Edit ${ariaLabel}`}
    >
      <span className={cn("truncate", !value && "text-muted-foreground")}>{value || placeholder || "—"}</span>
      <Pencil aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover/editable:opacity-100" />
    </button>
  );
}

// Click-to-edit text field: switches to a focused Input on click. Enter/Escape and blur all just
// drop back to text view — the value has already been living in the parent's draft state on every
// keystroke, so there's nothing separate to commit or roll back.
function EditableTextCell({
  value,
  onChange,
  ariaLabel,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <Input
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur();
        }}
        placeholder={placeholder}
        className="h-8"
        aria-label={ariaLabel}
      />
    );
  }

  return <EditableDisplay value={value} ariaLabel={ariaLabel} placeholder={placeholder} onClick={() => setEditing(true)} />;
}

// Website's display mode is a real clickable link (opens in a new tab) instead of plain text, with
// the same hover pencil next to it — clicking the link navigates, clicking the pencil edits.
function EditableUrlCell({
  value,
  onChange,
  ariaLabel,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <Input
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur();
        }}
        placeholder={placeholder}
        className="h-8"
        aria-label={ariaLabel}
      />
    );
  }

  if (!value) {
    return <EditableDisplay value="" ariaLabel={ariaLabel} placeholder={placeholder} onClick={() => setEditing(true)} />;
  }

  const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return (
    <div className="group/editable flex h-8 w-full items-center justify-between gap-1 rounded-lg px-2.5 hover:bg-muted/50">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="truncate text-sm underline underline-offset-4 hover:text-primary"
        aria-label={`${value} (opens in a new tab)`}
      >
        {value}
      </a>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Edit ${ariaLabel}`}
        className="shrink-0 rounded p-0.5 hover:bg-muted"
      >
        <Pencil aria-hidden="true" className="size-3.5 text-muted-foreground opacity-0 group-hover/editable:opacity-100" />
      </button>
    </div>
  );
}

// Click-to-edit single select (native <select>, not the portal-based common/select — this stays a
// plain DOM element so onBlur reliably closes it back to text view, same as the Input cells).
function EditableSelectCell({
  value,
  onChange,
  options,
  labels,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  labels: Record<string, string>;
  ariaLabel: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <select
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setEditing(false)}
        className={selectClassName}
        aria-label={ariaLabel}
      >
        {options.map((option) => (
          <option key={option} value={option}>{labels[option] ?? option}</option>
        ))}
      </select>
    );
  }

  return <EditableDisplay value={labels[value] ?? value} ariaLabel={ariaLabel} onClick={() => setEditing(true)} />;
}

// Click-to-edit multi-select for service regions: a small checkbox group instead of a native
// <select multiple> (fiddly ctrl/cmd-click UX) or the portal-based common/select (its popover
// content renders outside this cell's DOM, so a simple onBlur would close it the instant focus
// moves into the popover). A document-level pointerdown listener closes it on an outside click,
// which works regardless of where the checkboxes render.
function EditableRegionsCell({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRegions = useMemo(() => value.split(",").map((region) => region.trim()).filter(Boolean), [value]);

  useEffect(() => {
    if (!editing) return;
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setEditing(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [editing]);

  function toggleRegion(region: string, checked: boolean) {
    const next = checked ? [...selectedRegions, region] : selectedRegions.filter((r) => r !== region);
    onChange(next.join(", "));
  }

  if (editing) {
    return (
      <div ref={containerRef} className="flex flex-col gap-1.5 rounded-lg border border-input bg-popover p-2 shadow-md">
        {serviceRegionOptions.map((region) => (
          <label key={region} className="flex items-center gap-2 text-sm">
            <Checkbox checked={selectedRegions.includes(region)} onCheckedChange={(checked) => toggleRegion(region, checked === true)} />
            {region}
          </label>
        ))}
      </div>
    );
  }

  return <EditableDisplay value={selectedRegions.join(", ")} ariaLabel={ariaLabel} placeholder="Select regions" onClick={() => setEditing(true)} />;
}

// NEEDS_GPHC is the actionable case — a real ED product page was already found, it just needs a
// regulator reference typed into the already-editable column above before Promote will succeed
// (Provider.regulatorReference is required). BLOCKED means the site itself couldn't be checked at
// all, so it's worth opening directly rather than assuming it's just unprocessed backlog.
function EdFilterBadge({ audit }: { audit: EdFilterAudit | undefined }) {
  if (!audit) return null;
  if (audit.outcome === "NEEDS_GPHC") {
    return <Badge variant="default" title={audit.matchedUrls?.join(", ")}>ED match — needs GPhC #</Badge>;
  }
  return <Badge variant="outline" title={audit.reason}>Needs manual check</Badge>;
}

function CandidateRow({
  item,
  draft,
  onDraftChange,
  selected,
  onToggleSelected,
  rowError,
}: {
  item: CandidateItem;
  draft: PromoteDraft;
  onDraftChange: (id: string, patch: Partial<PromoteDraft>) => void;
  selected: boolean;
  onToggleSelected: (id: string, checked: boolean) => void;
  rowError?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function handleConfirmLink() {
    const matchedProvider = item.matchedProvider;
    if (!matchedProvider) return;
    setError(undefined);
    startTransition(async () => {
      const result = await linkDiscoveryCandidateToProvider(item.id, matchedProvider.id);
      if (result.error) setError(result.error);
    });
  }

  function handlePromote() {
    setError(undefined);
    startTransition(async () => {
      const result = await promoteDiscoveryCandidatesBulk([{ candidateId: item.id, ...draft }]);
      if ("error" in result) { setError(result.error); return; }
      const promoteError = result.errors[item.id];
      if (promoteError) setError(promoteError);
    });
  }

  function handleReject() {
    setError(undefined);
    startTransition(async () => {
      const result = await rejectDiscoveryCandidate(item.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <TableRow data-state={selected ? "selected" : undefined}>
      <TableCell>
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onToggleSelected(item.id, checked === true)}
          aria-label={`Select ${item.name}`}
        />
      </TableCell>
      <TableCell className="text-muted-foreground">{discoverySourceTypeLabels[item.source.type]}</TableCell>
      <TableCell className="max-w-xs">
        {item.matchedProvider ? (
          <>
            <p className="truncate font-medium">{item.name}</p>
            {item.postcode ? <p className="text-xs text-muted-foreground">{item.postcode}</p> : null}
          </>
        ) : (
          <EditableTextCell value={draft.tradingName} onChange={(value) => onDraftChange(item.id, { tradingName: value })} ariaLabel={`Trading name for ${item.name}`} />
        )}
      </TableCell>
      <TableCell className="max-w-xs">
        {item.matchedProvider ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <EditableTextCell value={draft.legalName} onChange={(value) => onDraftChange(item.id, { legalName: value })} ariaLabel={`Legal name for ${item.name}`} />
        )}
      </TableCell>
      <TableCell>
        {item.matchedProvider ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <EditableUrlCell value={draft.websiteDomain} onChange={(value) => onDraftChange(item.id, { websiteDomain: value })} placeholder="example-pharmacy.co.uk" ariaLabel={`Website for ${item.name}`} />
        )}
      </TableCell>
      <TableCell>
        {item.matchedProvider ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <EditableSelectCell
            value={draft.regulatorType}
            onChange={(value) => onDraftChange(item.id, { regulatorType: value as RegulatorType })}
            options={regulatorTypeValues}
            labels={regulatorTypeLabels}
            ariaLabel={`Regulator for ${item.name}`}
          />
        )}
      </TableCell>
      <TableCell>
        {item.matchedProvider ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <EditableTextCell value={draft.regulatorReference} onChange={(value) => onDraftChange(item.id, { regulatorReference: value })} ariaLabel={`Regulator reference for ${item.name}`} />
        )}
      </TableCell>
      <TableCell>
        {item.matchedProvider ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <EditableTextCell value={draft.dispensingPartnerName} onChange={(value) => onDraftChange(item.id, { dispensingPartnerName: value })} placeholder="Optional" ariaLabel={`Dispensing partner for ${item.name}`} />
        )}
      </TableCell>
      <TableCell>
        {item.matchedProvider ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <EditableRegionsCell value={draft.serviceRegions} onChange={(value) => onDraftChange(item.id, { serviceRegions: value })} ariaLabel={`Service regions for ${item.name}`} />
        )}
      </TableCell>
      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{identifierSummary(item)}</TableCell>
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          {item.matchedProvider ? (
            <Badge variant="outline">Possible match: {item.matchedProvider.tradingName}</Badge>
          ) : (
            <Badge variant="secondary">New</Badge>
          )}
          <EdFilterBadge audit={readEdFilterAudit(item.rawPayload)} />
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-wrap justify-end gap-1">
          {item.matchedProvider ? (
            <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={handleConfirmLink}>Confirm link</Button>
          ) : (
            <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={handlePromote}>Promote</Button>
          )}
          <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={handleReject}>Reject</Button>
        </div>
        {error || rowError ? <p className="mt-1 max-w-56 text-right text-xs text-destructive">{error ?? rowError}</p> : null}
        {!item.matchedProvider ? <div className="mt-1"><DiscoveryCandidateEdCheckActions id={item.id} /></div> : null}
      </TableCell>
    </TableRow>
  );
}

export function DiscoveryCandidateReviewTable({ items }: { items: CandidateItem[] }) {
  const [drafts, setDrafts] = useState<Record<string, PromoteDraft>>(() => Object.fromEntries(items.map((item) => [item.id, defaultDraft(item)])));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [bulkError, setBulkError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [onlyFlagged, setOnlyFlagged] = useState(false);

  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const flaggedCount = useMemo(() => items.filter((item) => readEdFilterAudit(item.rawPayload)).length, [items]);
  const visibleItems = useMemo(() => (onlyFlagged ? items.filter((item) => readEdFilterAudit(item.rawPayload)) : items), [items, onlyFlagged]);
  const pages = Math.max(1, Math.ceil(visibleItems.length / pageSize));
  const currentPage = Math.min(page, pages);
  const pagedItems = useMemo(
    () => visibleItems.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [visibleItems, currentPage, pageSize],
  );
  // "Select all" only covers the visible page — selecting across all 243+ candidates in one click
  // risks bulk-promoting rows staff never actually looked at (unedited defaults can fail validation
  // or, worse, silently promote with placeholder data). Individual checkboxes still accumulate
  // selections across page changes for a deliberate cross-page bulk action.
  const allOnPageSelected = pagedItems.length > 0 && pagedItems.every((item) => selected.has(item.id));

  function handleDraftChange(id: string, patch: Partial<PromoteDraft>) {
    setDrafts((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], ...patch } } : prev));
  }

  function handleToggleSelected(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleToggleAll(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const item of pagedItems) {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(1);
  }

  function handleToggleOnlyFlagged(checked: boolean) {
    setOnlyFlagged(checked);
    setPage(1);
  }

  function handleBulkReject() {
    setBulkError(undefined);
    startTransition(async () => {
      const result = await rejectDiscoveryCandidatesBulk([...selected]);
      if (result.error) {
        setBulkError(result.error);
        return;
      }
      setSelected(new Set());
    });
  }

  function handleBulkPromote() {
    setBulkError(undefined);
    startTransition(async () => {
      const ids = [...selected];
      const links = ids.reduce<{ candidateId: string; providerId: string }[]>((acc, id) => {
        const item = itemsById.get(id);
        if (item?.matchedProvider) acc.push({ candidateId: item.id, providerId: item.matchedProvider.id });
        return acc;
      }, []);
      const rows = ids.reduce<PromoteDiscoveryCandidateRow[]>((acc, id) => {
        const item = itemsById.get(id);
        if (item && !item.matchedProvider) acc.push({ candidateId: id, ...(drafts[id] ?? defaultDraft(item)) });
        return acc;
      }, []);

      const [linkResult, promoteResult] = await Promise.all([
        links.length > 0 ? linkDiscoveryCandidatesToProvidersBulk(links) : Promise.resolve({ succeeded: [] as string[], errors: {} as Record<string, string> }),
        rows.length > 0 ? promoteDiscoveryCandidatesBulk(rows) : Promise.resolve({ succeeded: [] as string[], errors: {} as Record<string, string> }),
      ]);

      if ("error" in linkResult) { setBulkError(linkResult.error); return; }
      if ("error" in promoteResult) { setBulkError(promoteResult.error); return; }

      const succeededIds = new Set([...linkResult.succeeded, ...promoteResult.succeeded]);
      setRowErrors({ ...linkResult.errors, ...promoteResult.errors });
      setSelected((prev) => new Set([...prev].filter((id) => !succeededIds.has(id))));
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Discovery candidates ({items.length})</CardTitle>
        {items.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {flaggedCount > 0 ? (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={onlyFlagged} onCheckedChange={(checked) => handleToggleOnlyFlagged(checked === true)} />
                Only flagged for manual check ({flaggedCount})
              </label>
            ) : null}
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            <Button type="button" size="sm" variant="outline" disabled={selected.size === 0 || isPending} onClick={handleBulkPromote}>
              Promote selected
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={selected.size === 0 || isPending} onClick={handleBulkReject}>
              Reject selected
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="px-0">
        {bulkError ? <p className="px-4 pb-2 text-sm text-destructive">{bulkError}</p> : null}
        {visibleItems.length === 0 ? (
          <EmptyState title={onlyFlagged ? "No candidates flagged for manual check." : "No discovery candidates awaiting review."} />
        ) : (
          <Table resizable={false}>
            <TableHeader>
              <TableRow>
                <TableHead minWidth={44}>
                  <Checkbox checked={allOnPageSelected} onCheckedChange={(checked) => handleToggleAll(checked === true)} aria-label="Select all candidates on this page" />
                </TableHead>
                <TableHead minWidth={170}>Source</TableHead>
                <TableHead minWidth={160}>Trading name</TableHead>
                <TableHead minWidth={160}>Legal name</TableHead>
                <TableHead minWidth={190}>Website</TableHead>
                <TableHead minWidth={150}>Regulator</TableHead>
                <TableHead minWidth={130}>Reg. reference</TableHead>
                <TableHead minWidth={160}>Dispensing partner</TableHead>
                <TableHead minWidth={150}>Regions</TableHead>
                <TableHead minWidth={200}>Identifiers</TableHead>
                <TableHead minWidth={100}>Status</TableHead>
                <TableHead className="text-right" minWidth={140}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedItems.map((item) => (
                <CandidateRow
                  key={item.id}
                  item={item}
                  draft={drafts[item.id] ?? defaultDraft(item)}
                  onDraftChange={handleDraftChange}
                  selected={selected.has(item.id)}
                  onToggleSelected={handleToggleSelected}
                  rowError={rowErrors[item.id]}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {visibleItems.length > 0 ? (
        <CardFooter className="border-t">
          <Pagination page={currentPage} setPage={setPage} pages={pages} total={visibleItems.length} pageSize={pageSize} onPageSizeChange={handlePageSizeChange} />
        </CardFooter>
      ) : null}
    </Card>
  );
}
