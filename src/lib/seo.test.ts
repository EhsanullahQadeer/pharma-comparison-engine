import assert from "node:assert/strict";
import test from "node:test";

import { serializeJsonLd } from "./seo";

test("serializes JSON-LD without allowing script-tag characters", () => {
  const serialized = serializeJsonLd({ title: "</script><script>alert(1)</script>", separator: "\u2028" });

  assert.doesNotMatch(serialized, /<\/script>|<script>/i);
  assert.match(serialized, /\\u003c\/script\\u003e/);
  assert.match(serialized, /\\u2028/);
});
