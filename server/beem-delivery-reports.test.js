import test from "node:test";
import assert from "node:assert/strict";
import { parseBeemDeliveryReport } from "./beem-delivery-reports.js";

test("accepts a matching delivered report for request ID and destination", () => {
  assert.deepEqual(
    parseBeemDeliveryReport(
      [{ request_id: "31951", dest_addr: "255700000002", status: "DELIVERED" }],
      "31951",
      "255700000002"
    ),
    { status: "DELIVERED" }
  );
});

test("normalizes a leading plus on the destination", () => {
  assert.deepEqual(
    parseBeemDeliveryReport(
      [{ request_id: "31951", dest_addr: "255700000002", status: "PENDING" }],
      "31951",
      "+255700000002"
    ),
    { status: "PENDING" }
  );
});

test("rejects a report for a different request ID or recipient", () => {
  const payload = [
    { request_id: "other", dest_addr: "255700000002", status: "DELIVERED" },
    { request_id: "31951", dest_addr: "255700000003", status: "DELIVERED" },
  ];
  assert.equal(parseBeemDeliveryReport(payload, "31951", "255700000002"), null);
});

test("rejects unknown statuses and malformed response shapes", () => {
  assert.equal(
    parseBeemDeliveryReport(
      [{ request_id: "31951", dest_addr: "255700000002", status: "EXPIRED" }],
      "31951",
      "255700000002"
    ),
    null
  );
  assert.equal(parseBeemDeliveryReport({ status: "DELIVERED" }, "31951", "255700000002"), null);
});

test("accepts only the three confirmed Beem delivery statuses", () => {
  for (const status of ["PENDING", "DELIVERED", "UNDELIVERED"]) {
    assert.deepEqual(
      parseBeemDeliveryReport(
        [{ request_id: "31951", dest_addr: "255700000002", status }],
        "31951",
        "255700000002"
      ),
      { status }
    );
  }
});

test("rejects empty request IDs and destinations", () => {
  const payload = [{ request_id: "31951", dest_addr: "255700000002", status: "DELIVERED" }];
  assert.equal(parseBeemDeliveryReport(payload, "", "255700000002"), null);
  assert.equal(parseBeemDeliveryReport(payload, "31951", ""), null);
});
