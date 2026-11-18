import crypto from "node:crypto";
import express from "express";

const router = express.Router();

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
const APP_SECRET = process.env.WHATSAPP_APP_SECRET?.trim();
// Short, one-way diagnostic fingerprint. Never log or expose the secret itself.
const APP_SECRET_FINGERPRINT = APP_SECRET
  ? crypto.createHash("sha256").update(APP_SECRET, "utf8").digest("hex").slice(0, 12)
  : null;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
const API_VERSION = process.env.WHATSAPP_API_VERSION?.trim() || "v26.0";

function safeEqualHex(left, right) {
  if (!left || !right) return false;
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

function checkMetaSignature(req) {
  if (!APP_SECRET) return { ok: false, reason: "app_secret_missing" };
  if (!Buffer.isBuffer(req.body)) return { ok: false, reason: "raw_body_missing" };
  const supplied = String(req.headers["x-hub-signature-256"] || "");
  if (!supplied.startsWith("sha256=")) {
    return { ok: false, reason: "signature_header_missing_or_malformed" };
  }
  const expected = crypto
    .createHmac("sha256", APP_SECRET)
    .update(req.body)
    .digest("hex");
  return safeEqualHex(supplied.slice(7), expected)
    ? { ok: true, reason: "valid" }
    : { ok: false, reason: "signature_mismatch" };
}

function getMessageText(message) {
  if (message?.text?.body) return message.text.body;
  if (message?.button?.text) return message.button.text;
  if (message?.interactive?.button_reply?.title) return message.interactive.button_reply.title;
  if (message?.interactive?.list_reply?.title) return message.interactive.list_reply.title;
  if (message?.image?.caption) return message.image.caption;
  if (message?.document?.caption) return message.document.caption;
  return message?.type ? `[${message.type}]` : "[Ujumbe usio na maandishi]";
}

function toIso(timestamp) {
  const seconds = Number(timestamp);
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : new Date().toISOString();
}

export function registerWhatsAppRoutes({ app, requireAuth, requireAdmin, supabaseAdmin }) {
  router.get("/", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && VERIFY_TOKEN && token === VERIFY_TOKEN && challenge) {
      return res.status(200).type("text/plain").send(challenge);
    }
    return res.sendStatus(403);
  });

  router.post("/", async (req, res) => {
    console.info("[WHATSAPP WEBHOOK] POST received", {
    appSecretFingerprint: APP_SECRET_FINGERPRINT,
      hasRawBody: Buffer.isBuffer(req.body),
      rawBodyBytes: Buffer.isBuffer(req.body) ? req.body.length : 0,
      hasSignatureHeader: Boolean(req.headers["x-hub-signature-256"]),
      contentType: req.headers["content-type"] || null,
    });

    const signatureCheck = checkMetaSignature(req);
    if (!signatureCheck.ok) {
      const suppliedSignature = String(req.headers["x-hub-signature-256"] || "");
      const signatureHex = suppliedSignature.startsWith("sha256=")
        ? suppliedSignature.slice(7)
        : "";
      console.warn("[WHATSAPP WEBHOOK] Signature rejected", {
        reason: signatureCheck.reason,
        signatureHeaderLength: suppliedSignature.length,
        signatureHexValid: /^[a-f0-9]{64}$/i.test(signatureHex),
        rawBodyBytes: Buffer.isBuffer(req.body) ? req.body.length : 0,
        contentEncoding: req.headers["content-encoding"] || "identity",
        contentLengthHeader: req.headers["content-length"] || null,
        transferEncoding: req.headers["transfer-encoding"] || null,
      });
      return res.status(APP_SECRET ? 401 : 503).json({
        ok: false,
        error: APP_SECRET
          ? "Webhook signature haijathibitishwa."
          : "WhatsApp App Secret haijawekwa kwenye server.",
      });
    }

    let body;
    try {
      body = JSON.parse(req.body.toString("utf8"));
    } catch {
      console.warn("[WHATSAPP WEBHOOK] Signed payload was not valid JSON");
      return res.sendStatus(400);
    }
    if (body?.object !== "whatsapp_business_account") {
      console.warn("[WHATSAPP WEBHOOK] Unexpected payload object", {
        object: body?.object || null,
      });
      return res.sendStatus(404);
    }

    try {
      let inboundReceived = 0;
      let inboundSaved = 0;
      let statusEventsReceived = 0;
      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          if (change.field !== "messages") continue;
          const value = change.value ?? {};

          for (const message of value.messages ?? []) {
            inboundReceived += 1;
            const sender = String(message.from || "").replace(/[^0-9]/g, "");
            if (!sender || !message.id) continue;

            const { error } = await supabaseAdmin
              .from("whatsapp_messages")
              .upsert({
                user_id: null,
                direction: "incoming",
                phone_number: sender,
                contact_name: value.contacts?.[0]?.profile?.name || null,
                message_text: getMessageText(message),
                message_type: message.type || "unknown",
                whatsapp_message_id: message.id,
                status: "received",
                sent_at: toIso(message.timestamp),
                updated_at: new Date().toISOString(),
              }, { onConflict: "whatsapp_message_id", ignoreDuplicates: true });

            if (error) {
              console.error("[WHATSAPP WEBHOOK] Inbound database save failed", {
                code: error.code || null,
                message: error.message,
              });
            } else {
              inboundSaved += 1;
            }
          }

          for (const item of value.statuses ?? []) {
            statusEventsReceived += 1;
            if (!item.id || !item.status) continue;
            const status = String(item.status).toLowerCase();
            const patch = {
              status,
              updated_at: new Date().toISOString(),
            };
            if (status === "sent") patch.sent_at = toIso(item.timestamp);
            if (status === "delivered") patch.delivered_at = toIso(item.timestamp);
            if (status === "read") patch.read_at = toIso(item.timestamp);
            if (status === "failed") {
              patch.error_message = (item.errors ?? [])
                .map((error) => error.title || error.message || error.code)
                .filter(Boolean)
                .join("; ") || "WhatsApp delivery failed.";
            }

            let statusUpdate = supabaseAdmin
              .from("whatsapp_messages")
              .update(patch)
              .eq("whatsapp_message_id", item.id);

            // Meta status callbacks can arrive out of order. Do not let a
            // late "sent" callback overwrite a previously delivered/read state.
            if (status === "sent") {
              statusUpdate = statusUpdate.neq("status", "delivered").neq("status", "read");
            } else if (status === "delivered") {
              statusUpdate = statusUpdate.neq("status", "read");
            }

            const { error } = await statusUpdate;
            if (error) console.error("WHATSAPP STATUS UPDATE ERROR:", error.message);

            // Keep the E-card guest's own delivery state in sync with Meta callbacks.
            const guestStatus = ["sent", "delivered", "read", "failed"].includes(status) ? status : null;
            if (guestStatus) {
              const guestPatch = { whatsapp_delivery_status: guestStatus };
              if (status === "failed") {
                guestPatch.whatsapp_delivery_error = patch.error_message || "WhatsApp delivery failed.";
              } else {
                guestPatch.whatsapp_delivery_error = null;
              }
              let guestStatusUpdate = supabaseAdmin
                .from("e_card_guests")
                .update(guestPatch)
                .eq("whatsapp_message_id", item.id);
              if (status === "sent") {
                guestStatusUpdate = guestStatusUpdate.neq("whatsapp_delivery_status", "delivered").neq("whatsapp_delivery_status", "read");
              } else if (status === "delivered") {
                guestStatusUpdate = guestStatusUpdate.neq("whatsapp_delivery_status", "read");
              }
              const { error: guestStatusError } = await guestStatusUpdate;
              if (guestStatusError) {
                console.error("[WHATSAPP WEBHOOK] E-card guest status update failed", {
                  code: guestStatusError.code || null,
                  message: guestStatusError.message,
                });
              }
            }
          }
        }
      }
      console.info("[WHATSAPP WEBHOOK] Processing completed", {
        inboundReceived,
        inboundSaved,
        statusEventsReceived,
      });
      return res.sendStatus(200);
    } catch (error) {
      console.error("[WHATSAPP WEBHOOK] Processing failed", {
        message: error.message,
      });
      return res.sendStatus(500);
    }
  });

  // Parse this endpoint as raw bytes before any JSON parsing. Meta signs the exact
  // request bytes, so parsing and re-serializing JSON can invalidate the signature.
  app.use("/api/whatsapp/webhook", express.raw({ type: "application/json", limit: "1mb" }));
  app.use("/api/whatsapp/webhook", router);

  app.get("/api/whatsapp/status", requireAuth, (req, res) => {
    const missing = [];
    if (!ACCESS_TOKEN) missing.push("WHATSAPP_ACCESS_TOKEN");
    if (!PHONE_NUMBER_ID) missing.push("WHATSAPP_PHONE_NUMBER_ID");
    if (!VERIFY_TOKEN) missing.push("WHATSAPP_VERIFY_TOKEN");
    if (!APP_SECRET) missing.push("WHATSAPP_APP_SECRET");
    return res.json({
      ok: true,
      configured: missing.length === 0,
      apiVersion: API_VERSION,
      missing,
      features: {
        outboundTextTest: Boolean(ACCESS_TOKEN && PHONE_NUMBER_ID),
        signedWebhook: Boolean(APP_SECRET && VERIFY_TOKEN),
        messageHistory: Boolean(supabaseAdmin),
      },
    });
  });

  app.get("/api/whatsapp/messages", requireAuth, async (req, res) => {
    try {
      const parsed = Number.parseInt(req.query.limit, 10);
      const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 50;
      const { data, error } = await supabaseAdmin
        .from("whatsapp_messages")
        .select("id, direction, phone_number, contact_name, message_text, message_type, status, error_message, sent_at, delivered_at, read_at, created_at")
        .eq("user_id", req.user.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return res.json({ ok: true, messages: data || [] });
    } catch (error) {
      console.error("WHATSAPP HISTORY ERROR:", error.message);
      return res.status(500).json({ ok: false, error: "Imeshindikana kupakia historia ya WhatsApp." });
    }
  });

  app.get("/api/whatsapp/admin/messages", requireAdmin, async (req, res) => {
    try {
      const parsed = Number.parseInt(req.query.limit, 10);
      const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 50;
      const { data, error } = await supabaseAdmin
        .from("whatsapp_messages")
        .select("id, user_id, direction, phone_number, contact_name, message_text, message_type, status, error_message, sent_at, delivered_at, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return res.json({ ok: true, messages: data || [] });
    } catch (error) {
      console.error("WHATSAPP ADMIN HISTORY ERROR:", error.message);
      return res.status(500).json({ ok: false, error: "Imeshindikana kupakia historia ya WhatsApp." });
    }
  });

  // Admin-only, single-recipient test endpoint. Customer billing is intentionally
  // not implemented until WhatsApp pricing and approved template flows are configured.
  app.post("/api/whatsapp/send-test", requireAdmin, async (req, res) => {
    if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
      return res.status(503).json({
        ok: false,
        error: "WhatsApp Cloud API haijakamilika kwenye Render.",
        missing: [
          ...(!ACCESS_TOKEN ? ["WHATSAPP_ACCESS_TOKEN"] : []),
          ...(!PHONE_NUMBER_ID ? ["WHATSAPP_PHONE_NUMBER_ID"] : []),
        ],
      });
    }

    const to = String(req.body?.to || "").replace(/[^0-9]/g, "");
    const message = String(req.body?.message || "").trim();
    if (to.length < 10 || to.length > 15) {
      return res.status(400).json({ ok: false, error: "Namba ya mpokeaji iwe katika muundo wa kimataifa, mfano 2557XXXXXXXX." });
    }
    if (!message || message.length > 4096) {
      return res.status(400).json({ ok: false, error: "Ujumbe unatakiwa kuwa na herufi 1 hadi 4096." });
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "text",
            text: { preview_url: false, body: message },
          }),
        }
      );

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = result?.error?.message || "WhatsApp Cloud API imekataa kutuma ujumbe.";
        await supabaseAdmin.from("whatsapp_messages").insert({
          user_id: req.user.id,
          direction: "outgoing",
          phone_number: to,
          message_text: message,
          message_type: "text",
          status: "failed",
          error_message: detail.slice(0, 1000),
        });
        return res.status(response.status >= 400 && response.status < 500 ? 422 : 502).json({
          ok: false,
          error: detail,
          metaCode: result?.error?.code || null,
        });
      }

      const messageId = result?.messages?.[0]?.id;
      const { error: saveError } = await supabaseAdmin
        .from("whatsapp_messages")
        .insert({
          user_id: req.user.id,
          direction: "outgoing",
          phone_number: to,
          message_text: message,
          message_type: "text",
          whatsapp_message_id: messageId || null,
          status: "sent",
          sent_at: new Date().toISOString(),
        });

      if (saveError) console.error("WHATSAPP OUTBOUND HISTORY SAVE ERROR:", saveError.message);
      return res.status(200).json({
        ok: true,
        messageId: messageId || null,
        status: "sent",
        historySaved: !saveError,
        billingApplied: false,
        note: "Hii ni test ya ujumbe mmoja; hakuna salio lililokatwa.",
      });
    } catch (error) {
      console.error("WHATSAPP SEND TEST ERROR:", error.message);
      return res.status(502).json({ ok: false, error: "Imeshindikana kuwasiliana na WhatsApp Cloud API." });
    }
  });
}
