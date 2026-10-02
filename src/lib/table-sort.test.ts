import assert from "node:assert/strict";
import { test } from "node:test";

import { nextSort, parseSort, sortRows } from "@/lib/table-sort";

const rows = [
  { name: "Well", price: 2400, checked: new Date("2026-10-01") },
  { name: "boots", price: 999, checked: null },
  { name: "Dr Fox", price: 10000, checked: new Date("2026-09-01") },
];

test("text sorts case-insensitively, numbers numerically", () => {
  assert.deepEqual(sortRows(rows, (row) => row.name, "asc").map((row) => row.name), ["boots", "Dr Fox", "Well"]);
  assert.deepEqual(sortRows(rows, (row) => row.price, "desc").map((row) => row.price), [10000, 2400, 999]);
  assert.deepEqual(sortRows(["100mg", "25mg", "50mg"], (row) => row, "asc"), ["25mg", "50mg", "100mg"]);
});

test("rows with no value stay last in both directions", () => {
  assert.deepEqual(sortRows(rows, (row) => row.checked, "asc").map((row) => row.name), ["Dr Fox", "Well", "boots"]);
  assert.deepEqual(sortRows(rows, (row) => row.checked, "desc").map((row) => row.name), ["Well", "Dr Fox", "boots"]);
});

test("sorting leaves the input untouched and keeps equal rows in their original order", () => {
  const equal = [{ id: 1, group: "a" }, { id: 2, group: "a" }, { id: 3, group: "a" }];
  assert.deepEqual(sortRows(equal, (row) => row.group, "desc").map((row) => row.id), [1, 2, 3]);
  assert.equal(rows[0].name, "Well");
});

test("a header click cycles ascending, descending, unsorted", () => {
  const asc = nextSort(null, "name");
  assert.deepEqual(asc, { sortBy: "name", sortOrder: "asc" });
  const desc = nextSort(asc, "name");
  assert.deepEqual(desc, { sortBy: "name", sortOrder: "desc" });
  assert.equal(nextSort(desc, "name"), null);
  assert.deepEqual(nextSort(desc, "price"), { sortBy: "price", sortOrder: "asc" });
});

test("search params are read leniently", () => {
  assert.deepEqual(parseSort("name", "desc"), { sortBy: "name", sortOrder: "desc" });
  assert.deepEqual(parseSort("name", "sideways"), { sortBy: "name", sortOrder: "asc" });
  assert.equal(parseSort(["a", "b"], undefined), undefined);
  assert.equal(parseSort(undefined, "desc"), undefined);
});
