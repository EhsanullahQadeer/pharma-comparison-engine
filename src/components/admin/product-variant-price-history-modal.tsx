"use client";

import { History } from "lucide-react";

import { Button } from "@/components/common/button";
import Modal from "@/components/common/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";

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

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function ProductVariantPriceHistoryModal({ pharmacyName, history }: { pharmacyName: string; history: PriceHistoryItem[] }) {
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead>Discount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((item) => (
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
      )}
    </Modal>
  );
}
