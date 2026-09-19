import { Search } from "lucide-react";

import { getProductVariants } from "@/actions/product-variants/product-variants";
import { ProductVariantDeleteButton } from "@/components/admin/product-variant-delete-button";
import { AddProductVariantModal, EditProductVariantModal } from "@/components/admin/product-variant-form-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import PaginationServer from "@/components/common/PaginationServer";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import { ingredientLabels, supplyClassificationLabels } from "@/lib/catalogue-labels";
import { parsePageSize } from "@/lib/pagination";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Product variants", robots: { index: false, follow: false } };

export default async function ProductVariantsPage(props: PageProps<"/admin/catalogue/product-variants">) {
  const { q, page: pageParam, pageSize: pageSizeParam } = await props.searchParams;
  const query = typeof q === "string" ? q : undefined;
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1;
  const pageSize = parsePageSize(typeof pageSizeParam === "string" ? pageSizeParam : undefined);

  const { variants, total, pages } = await getProductVariants(query, page, pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Product variants</h1>
          <p className="mt-1 text-sm text-muted-foreground">The provider-agnostic ingredient/strength/pack catalogue offers are priced against.</p>
        </div>
        <AddProductVariantModal />
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="text-sm text-muted-foreground">{total} variant{total === 1 ? "" : "s"}</CardTitle>
          <form action="/admin/catalogue/product-variants" className="relative w-full max-w-xs">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" type="search" defaultValue={query} placeholder="Search by brand or formulation…" className="pl-8" />
          </form>
        </CardHeader>
        <CardContent>
          {variants.length === 0 ? (
            <EmptyState title={query ? "No variants match that search." : "No product variants yet. Add the first one to start pricing offers against it."} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Strength</TableHead>
                  <TableHead>Formulation</TableHead>
                  <TableHead>Pack</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell className="font-medium">{ingredientLabels[variant.ingredient]}</TableCell>
                    <TableCell className="text-muted-foreground">{variant.brandName || "—"}</TableCell>
                    <TableCell>{variant.strengthMg}mg</TableCell>
                    <TableCell className="text-muted-foreground">{variant.formulation}</TableCell>
                    <TableCell>{variant.packQuantity}</TableCell>
                    <TableCell className="text-muted-foreground">{supplyClassificationLabels[variant.supplyClassification]}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <EditProductVariantModal variant={variant} />
                        <ProductVariantDeleteButton id={variant.id} label={`${ingredientLabels[variant.ingredient]} ${variant.strengthMg}mg`} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <PaginationServer pages={pages} total={total} />
    </div>
  );
}
