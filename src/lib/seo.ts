import type { Metadata } from "next";

// M1 compliance gate (docs/milestones/01-scope-and-compliance.md): every page that shows prices for
// prescription-only medicines stays out of search indexes until a solicitor has reviewed third-party
// POM price display. Tracked as an M8 launch gate — lift it here, in one place, once signed off.
export const pomPricingRobots: Metadata["robots"] = { index: false, follow: true };
