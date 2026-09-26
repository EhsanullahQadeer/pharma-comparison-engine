import assert from "node:assert/strict";
import { test } from "node:test";

import { staffSessionId, toStaffUserSession } from "./staff-session";

const staff = { id: "s1", name: "Sam Staff", email: "sam@example.test", role: "CATALOGUE_EDITOR" as const, active: true };

test("only a staff-kind session with an id identifies a staff member", () => {
  assert.equal(staffSessionId({ kind: "staff", id: "s1" }), "s1");
  assert.equal(staffSessionId(null), null);
  assert.equal(staffSessionId(undefined), null);
  // Tokens issued before account kinds existed carry no kind: treated as signed out.
  assert.equal(staffSessionId({ id: "s1" }), null);
  // Partner-portal sessions share the login but must never pass as staff.
  assert.equal(staffSessionId({ kind: "partner", id: "p1" }), null);
  assert.equal(staffSessionId({ kind: "staff" }), null);
});

test("the database record decides: missing or deactivated staff are rejected, role is fresh", () => {
  assert.equal(toStaffUserSession(null), null);
  assert.equal(toStaffUserSession({ ...staff, active: false }), null);
  assert.deepEqual(toStaffUserSession({ ...staff, role: "ADMINISTRATOR" }), { kind: "staff", id: "s1", name: "Sam Staff", email: "sam@example.test", role: "ADMINISTRATOR" });
});
