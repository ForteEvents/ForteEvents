export function registerWhatsAppRoutes({ app, requireAuth, requireAdmin, supabaseAdmin }) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const apiVersion = (process.env.WHATSAPP_API_VERSION || "v22.0").trim();

  const configReady = Boolean(accessToken && phoneNumberId);

  app.get("/api/whatsapp/status", requireAuth, (_req, res) => {
    res.json({ ok: true, configured: configReady });
  });

  app.get("/api/whatsapp/balance", requireAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("profiles").select("whatsapp_balance").eq("id", req.user.id).maybeSingle();
    if (error) return res.status(500).json({ ok: false, error: "Imeshindikana kusoma WhatsApp balance." });
    if (!data) return res.status(404).json({ ok: false, error: "Customer profile haijapatikana." });
    res.json({ ok: true, balance: Number(data.whatsapp_balance || 0) });
  });

  app.get("/api/whatsapp/history", requireAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin.from("whatsapp_history")
      .select("id, recipient, message, status, error_message, provider_message_id, sent_at, created_at")
      .eq("user_id", req.user.id).order("created_at", { ascending: false }).limit(200);
    if (error) return res.status(500).json({ ok: false, error: "Imeshindikana kupakia WhatsApp history." });
    res.json({ ok: true, history: data || [] });
  });

  app.post("/api/whatsapp/send", requireAuth, async (req, res) => {
    if (!configReady) return res.status(503).json({ ok: false, error: "WhatsApp Cloud API haijaunganishwa kikamilifu kwenye Render." });
    const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
    const recipients = Array.isArray(req.body.recipients) ? req.body.recipients : [];
    if (!message || message.length > 4096) return res.status(400).json({ ok: false, error: "Ujumbe lazima uwe na herufi 1 hadi 4096." });
    if (!recipients.length || recipients.length > 1000) return res.status(400).json({ ok: false, error: "Weka wapokeaji 1 hadi 1000." });

    const normalized = recipients.map((item) => ({
      name: String(item?.name || "").trim(),
      phone: String(item?.phone || "").replace(/[\\s()+-]/g, ""),
    }));
    if (normalized.some((item) => !/^\\d{8,15}$/.test(item.phone))) {
      return res.status(400).json({ ok: false, error: "Kuna namba isiyo sahihi. Tumia muundo wa kimataifa bila alama, mfano 255712345678." });
    }
    if (new Set(normalized.map((item) => item.phone)).size !== normalized.length) {
      return res.status(400).json({ ok: false, error: "Ondoa namba zinazojirudia kabla ya kutuma." });
    }

    const results = [];
    let sent = 0;
    let failed = 0;
    for (const recipient of normalized) {
      const { data: reserved, error: reserveError } = await supabaseAdmin
        .from("profiles").update({ whatsapp_balance: supabaseAdmin.rpc ? undefined : undefined })
        .eq("id", req.user.id).select("id").maybeSingle();
      // The atomic SQL function prevents concurrent requests from spending the same credit.
      const reservation = await supabaseAdmin.rpc("reserve_whatsapp_credit", { p_user_id: req.user.id });
      if (reservation.error) {
        console.error("WHATSAPP CREDIT RESERVATION ERROR:", reservation.error.message);
        return res.status(500).json({ ok: false, error: "Imeshindikana kuhifadhi WhatsApp credit. Hakikisha migration ya WhatsApp imeendeshwa." });
      }
      if (!reservation.data) {
        return res.status(400).json({ ok: false, error: "WhatsApp credits hazitoshi.", sent, failed, results });
      }

      let status = "failed";
      let errorMessage = null;
      let providerMessageId = null;
      try {
        const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: recipient.phone,
            type: "text",
            text: { preview_url: false, body: message },
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.error) {
          errorMessage = payload.error?.message || `WhatsApp API ilikataa ombi (HTTP ${response.status}).`;
          await supabaseAdmin.rpc("refund_whatsapp_credit", { p_user_id: req.user.id });
        } else {
          status = "sent";
          providerMessageId = payload.messages?.[0]?.id || null;
          sent += 1;
        }
      } catch (error) {
        errorMessage = "Hitilafu ya mtandao; hali ya ujumbe haijathibitishwa. Kagua WhatsApp Manager kabla ya kujaribu tena.";
        // Network failures may have reached Meta; do not auto-refund to avoid duplicate-credit risk.
      }
      if (status === "failed") failed += 1;
      const { error: historyError } = await supabaseAdmin.from("whatsapp_history").insert({
        user_id: req.user.id, recipient: recipient.phone, message, status,
        error_message: errorMessage, provider_message_id: providerMessageId,
        sent_at: status === "sent" ? new Date().toISOString() : null,
      });
      if (historyError) console.error("WHATSAPP HISTORY SAVE ERROR:", historyError.message);
      results.push({ name: recipient.name, phone: recipient.phone, status, error: errorMessage });
    }
    const { data: balanceRow } = await supabaseAdmin.from("profiles").select("whatsapp_balance").eq("id", req.user.id).maybeSingle();
    res.json({ ok: failed === 0, message: failed ? "Baadhi ya ujumbe haukutumwa." : "Ujumbe umetumwa kwa WhatsApp API.", sent, failed, balance: Number(balanceRow?.whatsapp_balance || 0), results });
  });

  app.post("/api/admin/whatsapp/credits/add", requireAdmin, async (req, res) => {
    const userId = String(req.body.userId || "");
    const amount = Number(req.body.amount);
    if (!userId || !Number.isSafeInteger(amount) || amount <= 0 || amount > 1000000) {
      return res.status(400).json({ ok: false, error: "Weka customer na idadi sahihi ya credits (1 hadi 1,000,000)." });
    }
    const { data, error } = await supabaseAdmin.rpc("add_whatsapp_credits", { p_user_id: userId, p_amount: amount });
    if (error) return res.status(500).json({ ok: false, error: "Imeshindikana kuongeza WhatsApp credits. Hakikisha migration imeendeshwa." });
    res.json({ ok: true, added: amount, balance: Number(data) });
  });

  app.get("/api/admin/customers/:customerId/whatsapp-history", requireAdmin, async (req, res) => {
    const { data, error } = await supabaseAdmin.from("whatsapp_history")
      .select("id, recipient, message, status, error_message, provider_message_id, sent_at, created_at")
      .eq("user_id", req.params.customerId).order("created_at", { ascending: false }).limit(200);
    if (error) return res.status(500).json({ ok: false, error: "Imeshindikana kupakia WhatsApp history." });
    res.json({ ok: true, history: data || [] });
  });
}
