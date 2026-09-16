import { DiscoveryAdapterNotImplementedError } from "@/lib/discovery/errors";
import type { DiscoveryAdapter } from "@/types/discovery";

export const gphcAdapter: DiscoveryAdapter = {
  type: "GPHC",
  async run() {
    throw new DiscoveryAdapterNotImplementedError(
      "GPhC adapter not implemented — the registers page returned 403 and the free premises " +
        "spreadsheet's live URL/headers are unconfirmed as of 2026-09-16. Verify the real download " +
        "location and column headers before building this (see docs/pharmacy-discovery-research-review.md).",
    );
  },
};
