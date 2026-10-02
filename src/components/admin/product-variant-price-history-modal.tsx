"use client";

import { History } from "lucide-react";

import { Button } from "@/components/common/button";
import Modal from "@/components/common/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { TableViewPagination } from "@/components/common/table-view-pagination";
import { useTableView } from "@/hooks/useTableView";
import type { TableSorters } from "@/types/table";

type PriceHistoryItem = {
  id: string;
  itemPricePence: number;
  deliveryFeePence: number;
  consultationFeePence: number;
  otherMandatoryFeesPence: number;
  deliveredTotalPence: number;
  availability: string;
  effectiveFrom: Date;
  recordedAt: Date;
  activeDiscountSnapshot: unknown;
};

const sorters = {
  date: (item) => item.recordedAt,
  item: (item) => item.itemPricePence,
  delivery: (item) => item.deliveryFeePence,
  total: (item) => item.deliveredTotalPence,
  availability: (item) => item.availability,
} satisfies TableSorters<PriceHistoryItem>;

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function ProductVariantPriceHistoryModal({ pharmacyName, history }: { pharmacyName: string; history: PriceHistoryItem[] }) {
  const view = useTableView(history, sorters);
  return (
    <Modal
      title={`${pharmacyName} price history`}
      description="Saved price snapshots for this product variant."
      contentClassName="sm:max-w-4xl"
      trigger={(
        <Button type="button" size="sm" variant="outline">
          <History aria-hidden="true" className="mr-1 size-4" />
          History
        </Button>
      )}
    >
      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">No price history has been saved yet.</p>
      ) : (
        <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead {...view.sortProps("date")}>Date</TableHead>
              <TableHead {...view.sortProps("item")}>Item</TableHead>
              <TableHead {...view.sortProps("delivery")}>Delivery</TableHead>
              <TableHead {...view.sortProps("total")}>Total</TableHead>
              <TableHead {...view.sortProps("availability")}>Availability</TableHead>
              <TableHead>Discount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.rows.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-xs text-muted-foreground">{formatDate(item.recordedAt)}</TableCell>
                <TableCell>{formatPence(item.itemPricePence)}</TableCell>
                <TableCell>{formatPence(item.deliveryFeePence)}</TableCell>
                <TableCell>{formatPence(item.deliveredTotalPence)}</TableCell>
                <TableCell className="text-muted-foreground">{item.availability.replaceAll("_", " ").toLowerCase()}</TableCell>
                <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                  {item.activeDiscountSnapshot ? JSON.stringify(item.activeDiscountSnapshot) : "None"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TableViewPagination pagination={view.pagination} />
        </>
      )}
    </Modal>
  );
}
