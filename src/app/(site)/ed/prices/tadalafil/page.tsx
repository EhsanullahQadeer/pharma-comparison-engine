import { IngredientPricesView, ingredientPageCopy } from "@/components/ed/ingredient-prices-view";
import { pomPricingRobots } from "@/lib/seo";

import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Tadalafil & Cialis prices compared — UK pharmacies",
  description: ingredientPageCopy.TADALAFIL.description,
  alternates: { canonical: "/ed/prices/tadalafil" },
  robots: pomPricingRobots,
};

export default function TadalafilPricesPage() {
  return <IngredientPricesView ingredient="TADALAFIL" />;
}
