// Central brand identity — replaces hardcoded "PharmaCompare" string literals across the root
// layout metadata, header, footer, and admin sidebar/shell/login.
export type SiteConfig = {
  brandName: string;
  brandShortName: string;
  tagline: string;
};

export const siteConfig: SiteConfig = {
  brandName: "PharmaCompare ED",
  brandShortName: "PharmaCompare",
  tagline: "Erectile dysfunction treatment",
};
