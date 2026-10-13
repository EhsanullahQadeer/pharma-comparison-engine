import assert from "node:assert/strict";
import test from "node:test";

import { SOURCES } from "./article-sources";
import { untrustedSources } from "./trusted-sources";

test("every source the built-in articles cite is a trusted one", () => {
  assert.deepEqual(untrustedSources(Object.values(SOURCES)), []);
});

test("subdomains of a trusted organisation are accepted", () => {
  assert.deepEqual(untrustedSources(["WHO: Sexual health — https://www.who.int/health-topics/sexual-health", "https://pubmed.ncbi.nlm.nih.gov/10637462/"]), []);
});

test("other websites, lookalike domains and sources with no link are refused", () => {
  const sources = [
    "A pharmacy blog — https://www.example-pharmacy.co.uk/blog/viagra",
    "Lookalike — https://nhs.uk.example.com/sildenafil",
    "Lookalike — https://fakenhs.uk/sildenafil",
    "NHS leaflet, no link",
  ];
  assert.deepEqual(untrustedSources(sources), sources);
});
