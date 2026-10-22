import assert from "node:assert/strict";
import { test } from "node:test";

import { hashInviteToken, INVITE_TOKEN_PATTERN, newInviteToken, partnerAccountStatus, partnerSessionId, toPartnerUserSession, type PartnerRecord } from "@/lib/partner-session";

const now = new Date("2026-10-22T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function partner(overrides: Partial<PartnerRecord> = {}, provider: Partial<PartnerRecord["provider"]> = {}): PartnerRecord {
  return {
    id: "p1", name: "Pat", email: "pat@pharmacy.test", active: true, passwordHash: "hash",
    ...overrides,
    provider: { id: "prov1", tradingName: "Test Pharmacy", affiliateApproved: true, partnershipEndedAt: null, ...provider },
  };
}

test("only a partner-kind session names a partner", () => {
  assert.equal(partnerSessionId({ kind: "partner", id: "p1" }), "p1");
  assert.equal(partnerSessionId({ kind: "staff", id: "s1" }), null);
  assert.equal(partnerSessionId({ id: "p1" }), null, "a token without a kind is signed out");
  assert.equal(partnerSessionId(null), null);
});

test("an active partner with a password at a partner pharmacy gets its own pharmacy, from the record", () => {
  const session = toPartnerUserSession(partner(), now);
  assert.deepEqual(session, { kind: "partner", id: "p1", name: "Pat", email: "pat@pharmacy.test", providerId: "prov1", providerName: "Test Pharmacy", accessEndsAt: null });
});

test("no access when deactivated, before the invite is accepted, or for a pharmacy that was never a partner", () => {
  assert.equal(toPartnerUserSession(partner({ active: false }), now), null);
  assert.equal(toPartnerUserSession(partner({ passwordHash: null }), now), null);
  assert.equal(toPartnerUserSession(partner({}, { affiliateApproved: false }), now), null);
  assert.equal(toPartnerUserSession(null, now), null);
});

test("after a partnership ends, access continues read-only for 90 days, then stops", () => {
  const ended = (daysAgo: number) => partner({}, { affiliateApproved: false, partnershipEndedAt: new Date(now.getTime() - daysAgo * DAY) });
  const within = toPartnerUserSession(ended(30), now);
  assert.equal(within?.accessEndsAt?.toISOString(), new Date(now.getTime() + 60 * DAY).toISOString());
  assert.equal(toPartnerUserSession(ended(89), now)?.providerId, "prov1");
  assert.equal(toPartnerUserSession(ended(90), now), null);
  assert.equal(toPartnerUserSession(ended(120), now), null);
});

test("invite tokens: random, only their hash is stored, valid for 7 days", () => {
  const a = newInviteToken(now);
  const b = newInviteToken(now);
  assert.notEqual(a.token, b.token);
  assert.match(a.token, INVITE_TOKEN_PATTERN);
  assert.equal(a.tokenHash, hashInviteToken(a.token));
  assert.notEqual(a.tokenHash, a.token);
  assert.equal(a.expiresAt.getTime() - now.getTime(), 7 * DAY);
});

test("account status for staff: access off wins, then a set password, then the invite's expiry", () => {
  const later = new Date(now.getTime() + DAY);
  const earlier = new Date(now.getTime() - DAY);
  assert.equal(partnerAccountStatus({ active: false, passwordHash: "h", inviteExpiresAt: null }, now), "ACCESS_OFF");
  assert.equal(partnerAccountStatus({ active: true, passwordHash: "h", inviteExpiresAt: null }, now), "ACTIVE");
  assert.equal(partnerAccountStatus({ active: true, passwordHash: null, inviteExpiresAt: later }, now), "INVITED");
  assert.equal(partnerAccountStatus({ active: true, passwordHash: null, inviteExpiresAt: earlier }, now), "INVITE_EXPIRED");
});
