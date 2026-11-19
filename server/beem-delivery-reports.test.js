import test from "node:test";
import assert from "node:assert/strict";
import { parseBeemDeliveryReport, registerBeemDeliveryReportRoutes } from "./beem-delivery-reports.js";

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


function createRouteHarness(rows = []) {
  const calls = [];
  let registered;
  const adminGate = (_req, _res, next) => next();
  const app = {
    post(routePath, middleware, handler) {
      registered = { routePath, middleware, handler };
    },
  };
  const supabaseAdmin = {
    from(table) {
      const query = {
        select(columns) { calls.push({ op: "select", table, columns }); return query; },
        update(values) { calls.push({ op: "update", table, values }); return query; },
        eq(column, value) { calls.push({ op: "eq", table, column, value }); return query; },
        not(column, operator, value) { calls.push({ op: "not", table, column, operator, value }); return query; },
        lt(column, value) { calls.push({ op: "lt", table, column, value }); return query; },
        or(value) { calls.push({ op: "or", table, value }); return query; },
        order(column, options) { calls.push({ op: "order", table, column, options }); return query; },
        limit(value) { calls.push({ op: "limit", table, value }); return Promise.resolve({ data: rows, error: null }); },
        then(resolve, reject) { return Promise.resolve({ error: null }).then(resolve, reject); },
      };
      return query;
    },
  };
  registerBeemDeliveryReportRoutes({
    app,
    requireAdmin: adminGate,
    supabaseAdmin,
    beemApiKey: "test-key",
    beemSecretKey: "test-secret",
  });
  return { registered, calls };
}

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("delivery check route is admin-gated and rejects a missing customer ID", async () => {
  const { registered, calls } = createRouteHarness();
  assert.equal(registered.routePath, "/api/admin/sms/delivery-reports/check");
  assert.equal(typeof registered.middleware, "function");
  const response = createResponse();
  await registered.handler({ body: {} }, response);
  assert.equal(response.statusCode, 400);
  assert.equal(calls.length, 0);
});

test("delivery check scopes both lookup and update to the selected customer and never sends SMS", async () => {
  const userId = "123e4567-e89b-42d3-a456-426614174000";
  const row = {
    id: "history-1",
    user_id: userId,
    recipient: "255756458095",
    status: "sent",
    sent_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    beem_request_id: "31951",
    beem_status: null,
    beem_status_checked_at: null,
  };
  const { registered, calls } = createRouteHarness([row]);
  const originalFetch = globalThis.fetch;
  const fetchCalls = [];
  globalThis.fetch = async (url, options) => {
    fetchCalls.push({ url: String(url), options });
    return {
      ok: true,
      json: async () => [{
        request_id: "31951",
        dest_addr: "255756458095",
        status: "DELIVERED",
      }],
    };
  };

  try {
    const response = createResponse();
    await registered.handler({ body: { userId, limit: 100 } }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.summary.delivered, 1);
    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0].options.method, "GET");
    assert.match(fetchCalls[0].url, /^https:\/\/dlrapi\.beem\.africa\//);
    assert.ok(calls.some(call => call.op === "eq" && call.column === "user_id" && call.value === userId));
    assert.equal(calls.filter(call => call.op === "limit").at(-1).value, 5);
    const update = calls.find(call => call.op === "update");
    assert.deepEqual(update.values, {
      beem_status: "DELIVERED",
      beem_status_checked_at: update.values.beem_status_checked_at,
      status: "delivered",
    });
    assert.ok(calls.some(call => call.op === "eq" && call.column === "user_id" && call.value === userId));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
