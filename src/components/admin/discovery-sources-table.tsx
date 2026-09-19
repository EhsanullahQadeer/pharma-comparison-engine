"use client";

import { useState } from "react";

import type { getDiscoverySources } from "@/actions/discovery/discovery-sources";
import { DiscoveryRunResultPanel, type DiscoveryRunResult } from "@/components/admin/discovery-run-result-panel";
import { EditDiscoverySourceModal } from "@/components/admin/discovery-source-form-modal";
import { DiscoverySourceRunButton } from "@/components/admin/discovery-source-run-button";
import { Badge } from "@/components/common/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import type { DiscoverySourceType } from "@/generated/prisma/client";
import { discoverySourceCredentialFields } from "@/lib/discovery-credential-fields";
import { discoveryCadenceLabels, discoveryRunStatusBadgeVariant, discoveryRunStatusLabels, discoverySourceTypeLabels } from "@/lib/discovery-labels";

type Source = Awaited<ReturnType<typeof getDiscoverySources>>[number];

function CredentialsStatus({ type, configuredKeys }: { type: DiscoverySourceType; configuredKeys: string[] }) {
  const expected = discoverySourceCredentialFields[type];
  if (expected.length === 0) return <span className="text-xs text-muted-foreground">Not required</span>;
  if (configuredKeys.length >= expected.length) return <Badge variant="default">Configured</Badge>;
  if (configuredKeys.length > 0) return <Badge variant="outline">Partial ({configuredKeys.length}/{expected.length})</Badge>;
  return <Badge variant="destructive">Not set</Badge>;
}

export function DiscoverySourcesTable({ sources }: { sources: Source[] }) {
  const [lastResult, setLastResult] = useState<{ sourceType: DiscoverySourceType; result: DiscoveryRunResult }>();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">{sources.length} source{sources.length === 1 ? "" : "s"}</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {sources.length === 0 ? (
            <EmptyState title="No discovery sources configured yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadence</TableHead>
                  <TableHead>Credentials</TableHead>
                  <TableHead>Last run</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => {
                  const lastRun = source.runs[0];
                  return (
                    <TableRow key={source.id}>
                      <TableCell className="font-medium">{discoverySourceTypeLabels[source.type]}</TableCell>
                      <TableCell>
                        <Badge variant={source.enabled ? "default" : "secondary"}>{source.enabled ? "Enabled" : "Disabled"}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{discoveryCadenceLabels[source.cadence]}</TableCell>
                      <TableCell>
                        <CredentialsStatus type={source.type} configuredKeys={source.configuredCredentialKeys} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lastRun ? (
                          <div className="space-y-1">
                            <Badge variant={lastRun.status ? discoveryRunStatusBadgeVariant[lastRun.status] : "secondary"}>
                              {lastRun.status ? discoveryRunStatusLabels[lastRun.status] : "Running…"}
                            </Badge>
                            <p className="text-xs">
                              {new Date(lastRun.startedAt).toLocaleString("en-GB")}
                              {lastRun.status ? (
                                <> · {lastRun.candidatesFound} candidate{lastRun.candidatesFound === 1 ? "" : "s"}</>
                              ) : (
                                <> · Awaiting completion</>
                              )}
                            </p>
                            {lastRun.errorMessage ? <p className="max-w-xs truncate text-xs text-destructive">{lastRun.errorMessage}</p> : null}
                          </div>
                        ) : (
                          "Never run"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <EditDiscoverySourceModal source={source} />
                          <DiscoverySourceRunButton
                            sourceId={source.id}
                            sourceType={source.type}
                            onResult={(result, sourceType) => setLastResult({ sourceType, result })}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {lastResult ? <DiscoveryRunResultPanel sourceType={lastResult.sourceType} result={lastResult.result} /> : null}
    </div>
  );
}
