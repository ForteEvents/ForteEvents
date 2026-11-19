const BEEM_DLR_URL = "https://dlrapi.beem.africa/public/v1/delivery-reports";
const MINIMUM_REPORT_AGE_MS = 5 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 100;

function normalizeDestination(value) {
  return String(value || "").trim().replace(/^\+/, "").replace(/^00/, "");
}

export function parseBeemDeliveryReport(payload, expectedRequestId, expectedDestination) {
  if (!Array.isArray(payload)) return null;

  const requestId = String(expectedRequestId);
  const destination = normalizeDestination(expectedDestination);

  const match = payload.find((item) =>
    item &&
    String(item.request_id ?? "") === requestId &&
    normalizeDestination(item.dest_addr) === destination
  );

  if (!match) return null;

  const status = String(match.status || "").toUpperCase();
  if (!["PENDING", "DELIVERED", "UNDELIVERED"].includes(status)) return null;

  return { status };
}

export function registerBeemDeliveryReportRoutes({
  app,
  requireAdmin,
  supabaseAdmin,
  beemApiKey,
  beemSecretKey,
}) {
  app.post("/api/admin/sms/delivery-reports/check", requireAdmin, async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(500).json({ ok: false, error: "Supabase haijaunganishwa." });
    }
    if (!beemApiKey || !beemSecretKey) {
      return res.status(503).json({ ok: false, error: "Beem credentials hazijawekwa." });
    }

    const requestedLimit = Number(req.body?.limit || DEFAULT_BATCH_SIZE);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(MAX_BATCH_SIZE, Math.max(1, Math.floor(requestedLimit)))
      : DEFAULT_BATCH_SIZE;

    const now = new Date();
    const eligibleSentAt = new Date(now.getTime() - MINIMUM_REPORT_AGE_MS).toISOString();
    const eligibleCheckedAt = new Date(now.getTime() - MINIMUM_REPORT_AGE_MS).toISOString();

    try {
      const { data: rows, error: selectError } = await supabaseAdmin
        .from("sms_history")
        .select("id, recipient, status, sent_at, beem_request_id, beem_status, beem_status_checked_at")
        .eq("status", "sent")
        .not("beem_request_id", "is", null)
        .lt("sent_at", eligibleSentAt)
        .or(`and(beem_status.is.null,beem_status_checked_at.is.null),and(beem_status.eq.PENDING,beem_status_checked_at.is.null),and(beem_status.is.null,beem_status_checked_at.lt.${eligibleCheckedAt}),and(beem_status.eq.PENDING,beem_status_checked_at.lt.${eligibleCheckedAt})`)
        .order("sent_at", { ascending: true })
        .limit(limit);

      if (selectError) throw selectError;

      const summary = {
        eligible: rows?.length || 0,
        checked: 0,
        delivered: 0,
        pending: 0,
        undelivered: 0,
        unavailable: 0,
        errors: 0,
      };

      const basic = Buffer.from(`${beemApiKey}:${beemSecretKey}`, "utf8").toString("base64");

      for (const row of rows || []) {
        const checkedAt = new Date().toISOString();

        try {
          const url = new URL(BEEM_DLR_URL);
          url.searchParams.set("dest_addr", normalizeDestination(row.recipient));
          url.searchParams.set("request_id", String(row.beem_request_id));

          const response = await fetch(url, {
            method: "GET",
            headers: {
              Authorization: `Basic ${basic}`,
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(15000),
          });

          if (!response.ok) {
            summary.errors += 1;
            // 404 can mean an unmatched request ID/destination. Keep the message
            // eligible for a later check; never infer delivery failure from it.
            await supabaseAdmin
              .from("sms_history")
              .update({ beem_status_checked_at: checkedAt })
              .eq("id", row.id)
              .eq("status", "sent")
              .or("beem_status.is.null,beem_status.eq.PENDING");
            if (response.status === 401) break;
            continue;
          }

          let payload;
          try {
            payload = await response.json();
          } catch {
            summary.errors += 1;
            await supabaseAdmin
              .from("sms_history")
              .update({ beem_status_checked_at: checkedAt })
              .eq("id", row.id)
              .eq("status", "sent")
              .or("beem_status.is.null,beem_status.eq.PENDING");
            continue;
          }

          const report = parseBeemDeliveryReport(
            payload,
            row.beem_request_id,
            row.recipient
          );

          if (!report) {
            summary.unavailable += 1;
            await supabaseAdmin
              .from("sms_history")
              .update({ beem_status_checked_at: checkedAt })
              .eq("id", row.id)
              .eq("status", "sent")
              .or("beem_status.is.null,beem_status.eq.PENDING");
            continue;
          }

          const update = {
            beem_status: report.status,
            beem_status_checked_at: checkedAt,
          };

          if (report.status === "DELIVERED") {
            update.status = "delivered";
            summary.delivered += 1;
          } else if (report.status === "UNDELIVERED") {
            update.status = "failed";
            summary.undelivered += 1;
          } else {
            summary.pending += 1;
          }

          const { error: updateError } = await supabaseAdmin
            .from("sms_history")
            .update(update)
            .eq("id", row.id)
            .eq("status", "sent")
            .or("beem_status.is.null,beem_status.eq.PENDING");

          if (updateError) {
            summary.errors += 1;
          } else {
            summary.checked += 1;
          }
        } catch (error) {
          summary.errors += 1;
          console.error("BEEM DELIVERY REPORT CHECK ERROR:", {
            rowId: row.id,
            message: error?.message || "Unknown error",
          });
          await supabaseAdmin
            .from("sms_history")
            .update({ beem_status_checked_at: checkedAt })
            .eq("id", row.id)
            .eq("status", "sent")
            .or("beem_status.is.null,beem_status.eq.PENDING");
        }
      }

      return res.json({
        ok: true,
        message: "Ukaguzi wa delivery reports umekamilika. Hakuna SMS iliyotumwa tena wala credit zilizobadilishwa.",
        summary,
        nextCheckAfterMinutes: 5,
      });
    } catch (error) {
      console.error("BEEM DELIVERY REPORT BATCH ERROR:", error?.message || error);
      return res.status(500).json({
        ok: false,
        error: "Imeshindikana kukagua delivery reports.",
      });
    }
  });
}
