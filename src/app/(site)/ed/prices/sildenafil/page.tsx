import { IngredientPricesView, ingredientPageCopy } from "@/components/ed/ingredient-prices-view";
import { pomPricingRobots } from "@/lib/seo";

import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Sildenafil & Viagra prices compared — UK pharmacies",
  description: ingredientPageCopy.SILDENAFIL.description,
  alternates: { canonical: "/ed/prices/sildenafil" },
  robots: pomPricingRobots,
};

export default function SildenafilPricesPage() {
  return <IngredientPricesView ingredient="SILDENAFIL" />;
}
