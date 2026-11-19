import { randomUUID } from "node:crypto";

const DLR_URL = "https://dlrapi.beem.africa/public/v1/delivery-reports";
const SEND_URL = "https://apisms.beem.africa/v1/send";
const MIN_AGE_MS = 5 * 60 * 1000;

export function isSafeAdminResendCandidate(row) {
  return row?.status === "failed" && row?.beem_status === "UNDELIVERED";
}

function normalizePhone(value) {
  return String(value || "").trim().replace(/^\+/, "").replace(/^00/, "");
}

function parseReport(payload, requestId, recipient) {
  if (!Array.isArray(payload)) return null;
  const match = payload.find((item) =>
    item &&
    String(item.request_id ?? "") === String(requestId) &&
    normalizePhone(item.dest_addr) === normalizePhone(recipient)
  );
  const status = String(match?.status || "").toUpperCase();
  return ["PENDING", "DELIVERED", "UNDELIVERED"].includes(status) ? status : null;
}

function authHeader(apiKey, secret) {
  return "Basic " + Buffer.from(`${apiKey}:${secret}`, "utf8").toString("base64");
}

export function registerAdminSmsManagementRoutes({
  app, requireAdmin, supabaseAdmin, beemApiKey, beemSecretKey, beemSenderId = "ForteEvents"
}) {
  app.get("/api/admin/sms/history", requireAdmin, async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ ok: false, error: "Supabase haijaunganishwa." });
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);
    const status = String(req.query.status || "").trim().toLowerCase();
    const search = String(req.query.search || "").trim().slice(0, 100);
    try {
      let query = supabaseAdmin.from("sms_history")
        .select("id,user_id,recipient,message,sms_count,status,error_message,sent_at,created_at,beem_request_id,beem_status,beem_status_checked_at,resend_of_id,resend_by", { count: "exact" })
        .order("sent_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (status === "delivered") query = query.or("status.eq.delivered,beem_status.eq.DELIVERED");
      else if (status === "pending") query = query.or("beem_status.eq.PENDING,and(status.eq.sent,beem_status.is.null)");
      else if (status === "failed") query = query.or("status.eq.failed,beem_status.eq.UNDELIVERED");
      else if (status === "submitted") query = query.eq("status", "sent").is("beem_status", null);
      if (search) query = query.or(`recipient.ilike.%${search}%,message.ilike.%${search}%`);
      const { data, error, count } = await query;
      if (error) throw error;
      const userIds = [...new Set((data || []).map(row => row.user_id).filter(Boolean))];
      let profiles = [];
      if (userIds.length) {
        const result = await supabaseAdmin.from("profiles").select("id,full_name,email").in("id", userIds);
        if (result.error) throw result.error;
        profiles = result.data || [];
      }
      const byId = new Map(profiles.map(profile => [profile.id, profile]));
      return res.json({
        ok: true, total: count || 0,
        history: (data || []).map(row => ({ ...row, customer: byId.get(row.user_id) || null }))
      });
    } catch (error) {
      console.error("ADMIN SMS HISTORY ERROR:", error?.message || error);
      return res.status(500).json({ ok: false, error: "Imeshindikana kupakia SMS zote." });
    }
  });

  app.get("/api/admin/sms/summary", requireAdmin, async (_req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ ok: false, error: "Supabase haijaunganishwa." });
    try {
      const count = async (filters) => {
        let query = supabaseAdmin.from("sms_history").select("id", { count: "exact", head: true });
        for (const [method, column, value] of filters) query = query[method](column, value);
        const result = await query;
        if (result.error) throw result.error;
        return result.count || 0;
      };
      const [all, delivered, pending, failed, submitted] = await Promise.all([
        count([]),
        count([["eq", "status", "delivered"]]),
        count([["eq", "beem_status", "PENDING"]]),
        count([["eq", "status", "failed"]]),
        count([["eq", "status", "sent"], ["is", "beem_status", null]])
      ]);
      return res.json({ ok: true, summary: { all, delivered, pending, failed, submitted } });
    } catch (error) {
      console.error("ADMIN SMS SUMMARY ERROR:", error?.message || error);
      return res.status(500).json({ ok: false, error: "Imeshindikana kupata muhtasari wa SMS." });
    }
  });

  app.post("/api/admin/sms/delivery-reports/check-all", requireAdmin, async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ ok: false, error: "Supabase haijaunganishwa." });
    if (!beemApiKey || !beemSecretKey) return res.status(503).json({ ok: false, error: "Beem credentials hazijawekwa." });
    const limit = Math.min(25, Math.max(1, Number.parseInt(req.body?.limit, 10) || 10));
    const cutoff = new Date(Date.now() - MIN_AGE_MS).toISOString();
    try {
      const { data: rows, error } = await supabaseAdmin.from("sms_history")
        .select("id,user_id,recipient,status,sent_at,beem_request_id,beem_status,beem_status_checked_at")
        .eq("status", "sent").not("beem_request_id", "is", null)
        .lt("sent_at", cutoff)
        .or(`and(beem_status.is.null,beem_status_checked_at.is.null),and(beem_status.eq.PENDING,beem_status_checked_at.is.null),and(beem_status.is.null,beem_status_checked_at.lt.${new Date(Date.now() - MIN_AGE_MS).toISOString()}),and(beem_status.eq.PENDING,beem_status_checked_at.lt.${new Date(Date.now() - MIN_AGE_MS).toISOString()})`)
        .order("sent_at", { ascending: true }).limit(limit);
      if (error) throw error;
      const summary = { checked: 0, delivered: 0, pending: 0, undelivered: 0, errors: 0 };
      const authorization = authHeader(beemApiKey, beemSecretKey);
      for (let i = 0; i < (rows || []).length; i += 5) {
        await Promise.all(rows.slice(i, i + 5).map(async row => {
          const checkedAt = new Date().toISOString();
          try {
            const url = new URL(DLR_URL);
            url.searchParams.set("dest_addr", normalizePhone(row.recipient));
            url.searchParams.set("request_id", String(row.beem_request_id));
            const response = await fetch(url, { headers: { Authorization: authorization, Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
            if (!response.ok) throw new Error(`Beem DLR HTTP ${response.status}`);
            const report = parseReport(await response.json(), row.beem_request_id, row.recipient);
            if (!report) throw new Error("Beem report haijathibitishwa kwa request ID na namba hii.");
            const update = { beem_status: report, beem_status_checked_at: checkedAt };
            if (report === "DELIVERED") update.status = "delivered";
            if (report === "UNDELIVERED") update.status = "failed";
            const saved = await supabaseAdmin.from("sms_history").update(update).eq("id", row.id).eq("status", "sent");
            if (saved.error) throw saved.error;
            summary.checked++;
            if (report === "DELIVERED") summary.delivered++;
            else if (report === "UNDELIVERED") summary.undelivered++;
            else summary.pending++;
          } catch (error) {
            summary.errors++;
            await supabaseAdmin.from("sms_history").update({ beem_status_checked_at: checkedAt }).eq("id", row.id).eq("status", "sent");
            console.error("ADMIN GLOBAL DLR CHECK ERROR:", { rowId: row.id, message: error?.message || "Unknown error" });
          }
        }));
      }
      return res.json({ ok: true, summary, message: "Ukaguzi umekamilika. Hakuna SMS iliyotumwa tena wala credits zilizobadilishwa." });
    } catch (error) {
      console.error("ADMIN GLOBAL DLR ERROR:", error?.message || error);
      return res.status(500).json({ ok: false, error: "Ukaguzi wa delivery reports umeshindikana." });
    }
  });

  app.post("/api/admin/sms/:messageId/resend", requireAdmin, async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ ok: false, error: "Supabase haijaunganishwa." });
    if (!beemApiKey || !beemSecretKey) return res.status(503).json({ ok: false, error: "Beem credentials hazijawekwa." });
    const messageId = String(req.params.messageId || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(messageId)) {
      return res.status(400).json({ ok: false, error: "SMS ID si sahihi." });
    }
    try {
      const { data: original, error: originalError } = await supabaseAdmin.from("sms_history")
        .select("id,user_id,recipient,message,sms_count,status,beem_status,beem_request_id")
        .eq("id", messageId).maybeSingle();
      if (originalError) throw originalError;
      if (!original) return res.status(404).json({ ok: false, error: "SMS haijapatikana." });
      if (!isSafeAdminResendCandidate(original)) {
        return res.status(409).json({ ok: false, error: "Resend inaruhusiwa tu baada ya Beem kuthibitisha UNDELIVERED." });
      }
      const retryId = randomUUID();
      const { data: reserved, error: reserveError } = await supabaseAdmin.from("sms_history").insert({
        user_id: original.user_id, recipient: original.recipient, message: original.message,
        sms_count: original.sms_count, status: "resending", error_message: "Admin resend — gharama imebebwa na ForteEvents.",
        sent_at: new Date().toISOString(), beem_request_id: null, beem_status: null,
        beem_status_checked_at: null, forteevents_message_id: retryId,
        resend_of_id: original.id, resend_by: req.user.id
      }).select("id").single();
      if (reserveError) {
        if (reserveError.code === "23505") return res.status(409).json({ ok: false, error: "SMS hii tayari imefanyiwa resend. Kagua historia yake." });
        throw reserveError;
      }
      try {
        const response = await fetch(SEND_URL, {
          method: "POST",
          headers: { Authorization: authHeader(beemApiKey, beemSecretKey), "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            source_addr: beemSenderId, encoding: 0, schedule_time: "", message: original.message,
            recipients: [{ recipient_id: "1", dest_addr: normalizePhone(original.recipient) }]
          }),
          signal: AbortSignal.timeout(20000)
        });
        const raw = await response.text();
        let payload;
        try { payload = JSON.parse(raw); } catch { payload = { raw }; }
        const accepted = response.ok && payload?.successful === true && Number(payload?.code) === 100 && Number(payload?.valid) === 1;
        const update = accepted
          ? { status: "sent", error_message: null, beem_request_id: payload.request_id != null ? String(payload.request_id) : null }
          : { status: "failed", error_message: JSON.stringify({ adminResend: true, httpStatus: response.status, providerCode: payload?.code ?? null, providerMessage: payload?.message || payload?.error || "Beem haikuthibitisha kupokea SMS." }) };
        const saved = await supabaseAdmin.from("sms_history").update(update).eq("id", reserved.id);
        if (saved.error) throw saved.error;
        return res.json({ ok: accepted, retryId: reserved.id, message: accepted ? "SMS imetumwa tena kwa gharama ya ForteEvents; salio la mteja halijakatwa." : "Beem haikuthibitisha kupokea resend. Hakuna salio la mteja lililokatwa.", beemRequestId: accepted ? (payload.request_id ?? null) : null });
      } catch (sendError) {
        await supabaseAdmin.from("sms_history").update({
          status: "unknown", error_message: "Resend imeanzishwa lakini majibu ya Beem hayakupatikana. Usirudie tena mpaka hali ithibitishwe."
        }).eq("id", reserved.id);
        return res.status(502).json({ ok: false, error: "Hali ya resend haijathibitishwa. Rekodi imehifadhiwa kama UNKNOWN ili kuzuia duplicate; usibonyeze resend tena." });
      }
    } catch (error) {
      console.error("ADMIN SMS RESEND ERROR:", error?.message || error);
      return res.status(500).json({ ok: false, error: "Imeshindikana kufanya resend." });
    }
  });
}
