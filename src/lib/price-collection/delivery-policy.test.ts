import assert from "node:assert/strict";
import { test } from "node:test";

import type { Prisma } from "@/generated/prisma/client";

import { applyDeliveryPolicyToOffers, resolveScrapedDelivery } from "./delivery-policy";

type OfferRow = { id: string; itemPricePence: number; deliveryFeePence: number };

// Just the calls the delivery helpers make, recording each offer update.
function fakeTx({ offers = [], policy = null }: { offers?: OfferRow[]; policy?: { standardFeePence: number; freeOverPence: number | null } | null }) {
  const updates: { id: string; data: Record<string, unknown> }[] = [];
  const tx = {
    offer: {
      findMany: async () => offers,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => updates.push({ id: where.id, data }),
    },
    deliveryPolicy: { findFirst: async () => policy },
  } as unknown as Prisma.TransactionClient;
  return { tx, updates };
}

const now = new Date("2026-10-19T12:00:00Z");

test("approving a delivery policy marks every offer's fees verified", async () => {
  const { tx, updates } = fakeTx({ offers: [{ id: "a", itemPricePence: 1000, deliveryFeePence: 0 }, { id: "b", itemPricePence: 5000, deliveryFeePence: 0 }] });
  const changed = await applyDeliveryPolicyToOffers(tx, "p", { standardFeePence: 290, freeOverPence: 4000 }, now);
  assert.deepEqual(changed, ["a"]);
  assert.deepEqual(updates.map(({ id, data }) => [id, data.deliveryFeePence, data.feeVerifiedAt]), [["a", 290, now], ["b", 0, now]]);
});

test("a scrape under an approved policy keeps the fees verified", async () => {
  const { tx } = fakeTx({ policy: { standardFeePence: 290, freeOverPence: null } });
  const delivery = await resolveScrapedDelivery(tx, "p", 1000, { deliveryFeePence: 0, deliveryAssumption: "page" }, null, now);
  assert.equal(delivery.deliveryFeePence, 290);
  assert.ok("feeVerifiedAt" in delivery && delivery.feeVerifiedAt === now);
});

test("a scrape without an approved policy leaves fee verification untouched", async () => {
  const { tx } = fakeTx({});
  const delivery = await resolveScrapedDelivery(tx, "p", 1000, { deliveryFeePence: 0, deliveryAssumption: "page" }, { deliveryFeePence: 350, deliveryAssumption: "kept" }, now);
  assert.deepEqual(delivery, { deliveryFeePence: 350, deliveryAssumption: "kept" });
});
