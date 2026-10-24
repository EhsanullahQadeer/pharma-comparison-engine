import assert from "node:assert/strict";
import { test } from "node:test";

import { buildProfilePriceGrids, formNote, gridForOffer, priceCellKey } from "@/lib/pharmacy-page";
import { publicOffer } from "@/lib/public-offer-fixture";
import type { PublicOffer } from "@/types/comparison";

const sildenafil = (strengthMg: number, packQuantity: number, formulation = "Film-coated tablet (generic)"): PublicOffer["variant"] => ({ id: `v-${strengthMg}-${packQuantity}-${formulation}`, ingredient: "SILDENAFIL", brandName: "Viagra", strengthMg, formulation, packQuantity });

test("form notes only for what sets a grid apart from a standard tablet", () => {
  assert.equal(formNote(sildenafil(50, 4)), null);
  assert.equal(formNote(sildenafil(50, 4, "Film-coated tablet")), null);
  assert.equal(formNote(sildenafil(50, 4, "Orodispersible tablet")), "Orodispersible tablet");
  assert.equal(formNote(sildenafil(5, 28, "Film-coated tablet (generic, daily dose)")), "daily dose");
});

test("one grid per product: strengths across, packs down, cheapest in-stock per tablet marked", () => {
  const offers = [
    publicOffer({ id: "a", providerId: "p", variant: sildenafil(25, 8), itemPricePence: 1035 }),
    publicOffer({ id: "b", providerId: "p", variant: sildenafil(50, 8), itemPricePence: 980 }),
    publicOffer({ id: "c", providerId: "p", variant: sildenafil(50, 32), itemPricePence: 3890 }),
    publicOffer({ id: "d", providerId: "p", variant: sildenafil(100, 4, "Film-coated tablet"), itemPricePence: 3670 }),
  ];
  const grids = buildProfilePriceGrids(offers);
  assert.deepEqual(grids.map((grid) => grid.product), ["Generic sildenafil", "Viagra"]);
  const [generic, viagra] = grids;
  assert.deepEqual(generic.strengths, [25, 50]);
  assert.deepEqual(generic.packs, [8, 32]);
  assert.deepEqual(generic.cells[priceCellKey(50, 32)].map((offer) => offer.id), ["c"]);
  assert.equal(generic.cells[priceCellKey(25, 32)], undefined, "a strength × pack the pharmacy doesn't sell is an empty cell");
  assert.equal(generic.bestValueOfferId, "c", "£38.90 for 32 (£1.22 a tablet) beats £9.80 for 8 (£1.23)…");
  assert.equal(viagra.bestValueOfferId, null, "…and a grid with a single price marks nothing");
});

test("melts, daily dose and subscriptions get grids of their own; a shared cell keeps every offer", () => {
  const offers = [
    publicOffer({ id: "film", providerId: "p", variant: sildenafil(25, 4, "Film-coated tablet") }),
    publicOffer({ id: "melt", providerId: "p", variant: sildenafil(25, 4, "Orodispersible tablet") }),
    publicOffer({ id: "plan", providerId: "p", variant: sildenafil(25, 4, "Film-coated tablet"), purchaseModel: "RECURRING" }),
    publicOffer({ id: "cheap", providerId: "p", variant: sildenafil(50, 4), itemPricePence: 900 }),
    publicOffer({ id: "sold-out", providerId: "p", variant: sildenafil(50, 4), itemPricePence: 500, availability: "OUT_OF_STOCK" }),
  ];
  const grids = buildProfilePriceGrids(offers);
  assert.deepEqual(grids.map((grid) => [grid.product, grid.formNote, grid.subscription]), [
    ["Generic sildenafil", null, false],
    ["Viagra", null, false],
    ["Viagra", "Orodispersible tablet", false],
    ["Viagra", null, true],
  ]);
  assert.deepEqual(grids[0].cells[priceCellKey(50, 4)].map((offer) => offer.id), ["cheap", "sold-out"], "in stock first, nothing dropped");
});

test("a clicked price picks out its own grid; an unknown or missing offer shows every product", () => {
  const offers = [
    publicOffer({ id: "film", providerId: "p", variant: sildenafil(25, 4, "Film-coated tablet") }),
    publicOffer({ id: "plan", providerId: "p", variant: sildenafil(25, 4, "Film-coated tablet"), purchaseModel: "RECURRING" }),
    publicOffer({ id: "generic", providerId: "p", variant: sildenafil(50, 4) }),
  ];
  const grids = buildProfilePriceGrids(offers);
  assert.equal(gridForOffer(grids, "plan")?.subscription, true, "the subscription grid, not the one-off Viagra grid");
  assert.equal(gridForOffer(grids, "generic")?.product, "Generic sildenafil");
  assert.equal(gridForOffer(grids, "gone"), null);
  assert.equal(gridForOffer(grids, undefined), null);
});
