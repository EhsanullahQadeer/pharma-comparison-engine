// Per-deployment brand identity (docs/milestones/00-platform-strategy.md: one codebase, one
// database per domain, env config selects brand name/tagline/active ProductCategory). This is the
// seam the platform pivot asked for — it does NOT yet generalize the ED route catalogue
// (src/lib/ed-pages.ts) or the site's URL prefix ("/ed/..."); those stay vertical #1's own content
// per docs/milestones/02-layout-theme-foundation.md, deliberately not rewritten in this pass. A
// second deployment reusing this layout for a different URL structure/content set is real future
// work, not solved here.
//
// Plain string literal for activeCategory, not a value-import of the generated Prisma client's
// ProductCategory enum — keeps Node-only driver adapter code out of client bundles (same reasoning
// as ingredientValues in catalogue-labels.ts).
export type DeploymentVertical = "ed" | "weight-loss";

export type SiteConfig = {
  brandName: string;
  brandShortName: string;
  tagline: string;
  activeCategory: "ERECTILE_DYSFUNCTION" | "WEIGHT_LOSS";
};

const siteConfigs: Record<DeploymentVertical, SiteConfig> = {
  ed: {
    brandName: "PharmaCompare ED",
    brandShortName: "PharmaCompare",
    tagline: "Erectile dysfunction treatment",
    activeCategory: "ERECTILE_DYSFUNCTION",
  },
  "weight-loss": {
    brandName: "PharmaCompare Weight Loss",
    brandShortName: "PharmaCompare",
    tagline: "Weight loss treatment",
    activeCategory: "WEIGHT_LOSS",
  },
};

function resolveDeploymentVertical(): DeploymentVertical {
  const raw = process.env.NEXT_PUBLIC_DEPLOYMENT_VERTICAL;
  return raw === "weight-loss" ? "weight-loss" : "ed";
}

export const siteConfig: SiteConfig = siteConfigs[resolveDeploymentVertical()];
