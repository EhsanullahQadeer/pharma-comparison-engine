import { getAvailableDiscoverySourceTypesForCreate, getDiscoverySources } from "@/actions/discovery/discovery-sources";
import { CreateDiscoverySourceModal } from "@/components/admin/discovery-source-form-modal";
import { DiscoverySourcesTable } from "@/components/admin/discovery-sources-table";
import { isDeepSeekEnabled } from "@/lib/discovery/enrichment-worker";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Discovery sources", robots: { index: false, follow: false } };

export default async function DiscoverySourcesPage() {
  const [sources, availableTypes] = await Promise.all([getDiscoverySources(), getAvailableDiscoverySourceTypesForCreate()]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Discovery sources</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administrator-only. Free UK registries this platform checks for candidate pharmacies. Fetch cadence and API
            credentials are per-source settings — turn a source on once its credentials are configured.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isDeepSeekEnabled()
              ? "New candidates are split between Google AI and the signed-in DeepSeek Web Search session, never sent to both."
              : "DeepSeek Web Search is paused — all new candidates are looked up with Google AI."}
          </p>
        </div>
        <CreateDiscoverySourceModal availableTypes={availableTypes} />
      </div>
      <DiscoverySourcesTable sources={sources} />
    </div>
  );
}
