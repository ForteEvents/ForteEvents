import test from "node:test";
import assert from "node:assert/strict";
import { isSafeAdminResendCandidate } from "./admin-sms-management.js";

test("only Beem-confirmed UNDELIVERED failed SMS can be resent", () => {
  assert.equal(isSafeAdminResendCandidate({ status: "failed", beem_status: "UNDELIVERED" }), true);
  assert.equal(isSafeAdminResendCandidate({ status: "sent", beem_status: "PENDING" }), false);
  assert.equal(isSafeAdminResendCandidate({ status: "delivered", beem_status: "DELIVERED" }), false);
  assert.equal(isSafeAdminResendCandidate({ status: "failed", beem_status: null }), false);
  assert.equal(isSafeAdminResendCandidate({ status: "sent", beem_status: "UNDELIVERED" }), false);
});
