import { notFound } from "next/navigation";

import { ProductPricesView } from "@/components/ed/ingredient-prices-view";
import { parseComparisonFilters } from "@/lib/comparison";
import { edHref } from "@/lib/ed-pages";
import { edProducts, productPath } from "@/lib/ed-products";
import { pomPricingRobots } from "@/lib/seo";

import type { Metadata } from "next";

export const dynamicParams = false;

export function generateStaticParams() {
  return edProducts.map((product) => ({ product: product.slug }));
}

async function resolveProduct(params: Promise<{ product: string }>) {
  const { product: slug } = await params;
  const product = edProducts.find((entry) => entry.slug === slug);
  if (!product) notFound();
  return product;
}

export async function generateMetadata(props: PageProps<"/ed/prices/[product]">): Promise<Metadata> {
  const product = await resolveProduct(props.params);
  return {
    title: `${product.name} prices compared — UK pharmacies`,
    description: product.description,
    alternates: { canonical: edHref(productPath(product)) },
    // Pharmacy medicines are sold without a prescription, so their price pages may be indexed.
    robots: product.prescriptionOnly ? pomPricingRobots : undefined,
  };
}

export default async function ProductPricesPage(props: PageProps<"/ed/prices/[product]">) {
  // The grid's pack, price mode, sort and search live in the URL, like the compare page's.
  const [product, searchParams] = await Promise.all([resolveProduct(props.params), props.searchParams]);
  return <ProductPricesView product={product} filters={parseComparisonFilters(searchParams)} />;
}
