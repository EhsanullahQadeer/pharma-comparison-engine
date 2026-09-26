import { CouponLayout, DashboardLayout, GuideLayout, SpotlightLayout, StickyCardLayout } from "@/components/ed/pharmacy-page/layouts-a";
import { BannerLayout, MagazineLayout, MinimalLayout, PricesFirstLayout, TimelineLayout } from "@/components/ed/pharmacy-page/layouts-b";
import { pharmacyLayoutIndex } from "@/lib/pharmacy-page";
import type { PharmacyPageModel } from "@/types/pharmacy-page";

import type { ComponentType } from "react";

// Index order is part of each pharmacy's identity (see pharmacyLayoutIndex) — append new layouts
// and bump PHARMACY_LAYOUT_COUNT rather than reordering, or every pharmacy's page would change.
const layouts: ComponentType<{ model: PharmacyPageModel }>[] = [
  SpotlightLayout,
  GuideLayout,
  StickyCardLayout,
  DashboardLayout,
  CouponLayout,
  TimelineLayout,
  MagazineLayout,
  MinimalLayout,
  BannerLayout,
  PricesFirstLayout,
];

export function PharmacyLayout({ model }: { model: PharmacyPageModel }) {
  const Layout = layouts[pharmacyLayoutIndex(model.provider.slug)];
  return <Layout model={model} />;
}
