import { countSmsParts } from "./sms-utils.js";

function normalizeDestination(value) {
  let phone = String(value || "").trim().replace(/[\s().-]/g, "");
  if (phone.startsWith("+")) phone = phone.slice(1);
  if (phone.startsWith("00")) phone = phone.slice(2);
  if (/^0[67]\d{8}$/.test(phone)) phone = "255" + phone.slice(1);
  if (/^[67]\d{8}$/.test(phone)) phone = "255" + phone;
  return phone;
}

function invitationUrl(origin, guest) {
  return origin.replace(/\/$/, "") + "/?card=" +
    encodeURIComponent(guest.card_slug) + "&guest=" +
    encodeURIComponent(guest.token);
}

async function sendSms({ guest, message, url, userId, supabaseAdmin, beemApiKey, beemSecretKey, senderId }) {
  const phone = normalizeDestination(guest.whatsapp_phone);
  if (!/^[1-9]\d{9,14}$/.test(phone)) {
    return { ok: false, error: "Namba ya simu si sahihi." };
  }
  const body = [`Habari ${guest.guest_name},`, message.trim(), url].filter(Boolean).join(" ");
  const smsCount = countSmsParts(body);
  const auth = Buffer.from(`${beemApiKey}:${beemSecretKey}`, "utf8").toString("base64");
  const response = await fetch("https://apisms.beem.africa/v1/send", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      source_addr: senderId,
      encoding: 0,
      schedule_time: "",
      message: body,
      recipients: [{ recipient_id: String(guest.id), dest_addr: phone }]
    })
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = { message: raw }; }
  const accepted = response.ok && data?.successful === true &&
    Number(data?.code) === 100 && Number(data?.valid) === 1;
  if (!accepted) {
    return { ok: false, error: String(data?.message || data?.error || "Beem haijathibitisha kupokea SMS."), smsCount };
  }
  await supabaseAdmin.from("sms_history").insert({
    user_id: userId,
    event_id: null,
    recipient: phone,
    message: body,
    sms_count: smsCount,
    status: "sent",
    beem_message_id: data?.data?.[0]?.message_id || data?.message_id || null,
    sent_at: new Date().toISOString()
  });
  return { ok: true, smsCount, messageId: data?.data?.[0]?.message_id || data?.message_id || null };
}

async function sendWhatsApp({ guest, message, url, templateName, language, accessToken, phoneNumberId, apiVersion }) {
  const to = normalizeDestination(guest.whatsapp_phone);
  if (!/^[1-9]\d{9,14}$/.test(to)) return { ok: false, error: "Namba ya WhatsApp si sahihi." };
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
        components: [{
          type: "body",
          parameters: [
            { type: "text", text: guest.guest_name },
            { type: "text", text: url }
          ]
        }]
      }
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, error: String(result?.error?.message || "Meta imekataa ujumbe wa WhatsApp.").slice(0, 900) };
  }
  return { ok: true, messageId: result?.messages?.[0]?.id || null };
}

export function registerECardDistribution({ app, requireAdmin, supabaseAdmin, env }) {
  app.post("/api/admin/ecard/:cardId/distribution-preview", requireAdmin, async (req, res) => {
    const cardId = String(req.params.cardId || "");
    const channel = String(req.body?.channel || "");
    const origin = String(req.body?.origin || "").trim();
    const smsMessage = String(req.body?.smsMessage || "").trim();
    if (!["whatsapp", "sms", "both"].includes(channel)) return res.status(400).json({ ok: false, error: "Chagua njia ya usambazaji." });
    if (!/^https:\/\//i.test(origin)) return res.status(400).json({ ok: false, error: "Tovuti ya mwaliko si sahihi." });
    if ((channel === "sms" || channel === "both") && !smsMessage) return res.status(400).json({ ok: false, error: "Andika ujumbe wa SMS." });
    try {
      const { data: card, error: cardError } = await supabaseAdmin.from("e_cards")
        .select("id,user_id,slug,is_published").eq("id", cardId).maybeSingle();
      if (cardError) throw cardError;
      if (!card || !card.is_published) return res.status(404).json({ ok: false, error: "Kadi haipo au haijachapishwa." });
      const { data: guests, error: guestError } = await supabaseAdmin.from("e_card_guests")
        .select("id,guest_name,token,whatsapp_phone,sms_delivery_status,whatsapp_delivery_status")
        .eq("card_id", cardId);
      if (guestError) throw guestError;
      const eligibleSms = (channel === "sms" || channel === "both")
        ? (guests || []).filter(g => ["pending", "failed"].includes(g.sms_delivery_status)) : [];
      const eligibleWa = (channel === "whatsapp" || channel === "both")
        ? (guests || []).filter(g => ["pending", "failed"].includes(g.whatsapp_delivery_status)) : [];
      const smsCredits = eligibleSms.reduce((total, guest) => {
        const url = invitationUrl(origin, { ...guest, card_slug: card.slug });
        return total + countSmsParts([`Habari ${guest.guest_name},`, smsMessage, url].filter(Boolean).join(" "));
      }, 0);
      const { data: profile, error: profileError } = await supabaseAdmin.from("profiles")
        .select("sms_balance").eq("id", card.user_id).maybeSingle();
      if (profileError) throw profileError;
      return res.json({
        ok: true, totalGuests: guests?.length || 0,
        eligibleSms: eligibleSms.length, eligibleWhatsApp: eligibleWa.length,
        smsCreditsRequired: smsCredits, smsBalance: Number(profile?.sms_balance || 0),
        smsBalanceSufficient: Number(profile?.sms_balance || 0) >= smsCredits,
        alreadySentSms: (guests || []).filter(g => g.sms_delivery_status === "sent").length,
        alreadySentWhatsApp: (guests || []).filter(g => ["sent", "delivered", "read"].includes(g.whatsapp_delivery_status)).length
      });
    } catch (error) {
      console.error("[E-CARD DISTRIBUTION PREVIEW] Failed", { message: error.message });
      return res.status(500).json({ ok: false, error: "Imeshindikana kuandaa muhtasari wa usambazaji." });
    }
  });

  app.post("/api/admin/ecard/:cardId/distribute", requireAdmin, async (req, res) => {
    const cardId = String(req.params.cardId || "");
    const channel = String(req.body?.channel || "");
    const origin = String(req.body?.origin || "").trim();
    const smsMessage = String(req.body?.smsMessage || "").trim();
    const templateName = String(req.body?.templateName || "").trim();
    const language = String(req.body?.language || "sw").trim();

    if (!["whatsapp", "sms", "both"].includes(channel)) {
      return res.status(400).json({ ok: false, error: "Chagua WhatsApp, SMS au njia zote mbili." });
    }
    if (!/^https:\/\//i.test(origin)) return res.status(400).json({ ok: false, error: "Tovuti ya mwaliko haijathibitishwa." });
    if ((channel === "sms" || channel === "both") && !smsMessage) {
      return res.status(400).json({ ok: false, error: "Andika ujumbe wa SMS kwanza." });
    }
    if ((channel === "whatsapp" || channel === "both") && !templateName) {
      return res.status(400).json({ ok: false, error: "Weka jina la WhatsApp template iliyoidhinishwa na Meta." });
    }
    if ((channel === "sms" || channel === "both") && (!env.BEEM_API_KEY || !env.BEEM_SECRET_KEY)) {
      return res.status(503).json({ ok: false, error: "Huduma ya Beem haijawekwa kikamilifu." });
    }
    if ((channel === "whatsapp" || channel === "both") && (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID)) {
      return res.status(503).json({ ok: false, error: "WhatsApp Cloud API haijawekwa kikamilifu." });
    }

    try {
      const { data: card, error: cardError } = await supabaseAdmin
        .from("e_cards").select("id,user_id,slug,is_published,source_request_id")
        .eq("id", cardId).maybeSingle();
      if (cardError) throw cardError;
      if (!card || !card.is_published) return res.status(404).json({ ok: false, error: "Kadi haipo au haijachapishwa." });

      const { data: guests, error: guestError } = await supabaseAdmin
        .from("e_card_guests")
        .select("id,guest_name,token,whatsapp_phone,sms_delivery_status,whatsapp_delivery_status")
        .eq("card_id", cardId).order("created_at", { ascending: true });
      if (guestError) throw guestError;
      if (!guests?.length) return res.status(400).json({ ok: false, error: "Kadi hii haina wageni." });

      const results = [];
      let claimedSms = 0;
      for (const guest of guests) {
        const needsSms = channel === "sms" || channel === "both";
        const needsWhatsApp = channel === "whatsapp" || channel === "both";
        const smsEligible = needsSms && ["pending", "failed"].includes(guest.sms_delivery_status);
        const waEligible = needsWhatsApp && ["pending", "failed"].includes(guest.whatsapp_delivery_status);
        if (!smsEligible && !waEligible) continue;

        let smsClaimed = false;
        let waClaimed = false;
        if (smsEligible) {
          const { data: claimed, error: claimError } = await supabaseAdmin
            .from("e_card_guests").update({ sms_delivery_status: "sending" })
            .eq("id", guest.id).eq("card_id", cardId)
            .in("sms_delivery_status", ["pending", "failed"])
            .select("id").maybeSingle();
          if (claimError) throw claimError;
          smsClaimed = Boolean(claimed);
        }
        if (waEligible) {
          const { data: claimed, error: claimError } = await supabaseAdmin
            .from("e_card_guests").update({ whatsapp_delivery_status: "sending" })
            .eq("id", guest.id).eq("card_id", cardId)
            .in("whatsapp_delivery_status", ["pending", "failed"])
            .select("id").maybeSingle();
          if (claimError) throw claimError;
          waClaimed = Boolean(claimed);
        }
        if (!smsClaimed && !waClaimed) continue;

        const url = invitationUrl(origin, { ...guest, card_slug: card.slug });
        const item = { guestId: guest.id, guestName: guest.guest_name, sms: null, whatsapp: null };

        if (smsEligible) {
          const { data: balance, error: reserveError } = await supabaseAdmin.rpc("reserve_sms_credits", {
            p_user_id: card.user_id,
            p_amount: countSmsParts([`Habari ${guest.guest_name},`, smsMessage, url].join(" "))
          });
          if (reserveError) throw reserveError;
          if (balance === null) {
            await supabaseAdmin.from("e_card_guests").update({ sms_delivery_status: "pending" }).eq("id", guest.id).eq("sms_delivery_status", "sending");
            item.sms = { ok: false, error: "Salio la SMS la mteja halitoshi." };
          } else {
            claimedSms += 1;
            try {
              const sent = await sendSms({
                guest, message: smsMessage, url, userId: card.user_id, supabaseAdmin,
                beemApiKey: env.BEEM_API_KEY, beemSecretKey: env.BEEM_SECRET_KEY,
                senderId: env.BEEM_SENDER_ID || "ForteEvents"
              });
              if (sent.ok) {
                await supabaseAdmin.from("e_card_guests").update({
                  sms_delivery_status: "sent", sms_delivery_error: null,
                  sms_beem_message_id: sent.messageId, sms_sent_at: new Date().toISOString()
                }).eq("id", guest.id);
                item.sms = { ok: true };
              } else {
                await supabaseAdmin.rpc("adjust_sms_credits", { p_user_id: card.user_id, p_amount: sent.smsCount || countSmsParts([`Habari ${guest.guest_name},`, smsMessage, url].join(" ")) });
                await supabaseAdmin.from("e_card_guests").update({
                  sms_delivery_status: "failed", sms_delivery_error: sent.error
                }).eq("id", guest.id);
                item.sms = { ok: false, error: sent.error };
              }
            } catch (sendError) {
              // Keep 'sending' on network uncertainty to prevent accidental duplicate delivery.
              await supabaseAdmin.from("e_card_guests").update({
                sms_delivery_error: "Hali ya kutuma haijathibitishwa; kagua Beem kabla ya retry."
              }).eq("id", guest.id);
              item.sms = { ok: false, uncertain: true, error: "Hali ya kutuma haijathibitishwa; imeachwa kwenye sending ili kuzuia ujumbe kurudiwa." };
            }
          }
        }

        if (waEligible) {
          try {
            const sent = await sendWhatsApp({
              guest, message: smsMessage, url, templateName, language,
              accessToken: env.WHATSAPP_ACCESS_TOKEN,
              phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
              apiVersion: env.WHATSAPP_API_VERSION || "v26.0"
            });
            if (sent.ok) {
              await supabaseAdmin.from("e_card_guests").update({
                whatsapp_delivery_status: "sent", whatsapp_delivery_error: null,
                whatsapp_message_id: sent.messageId, whatsapp_sent_at: new Date().toISOString()
              }).eq("id", guest.id);
              item.whatsapp = { ok: true };
            } else {
              await supabaseAdmin.from("e_card_guests").update({
                whatsapp_delivery_status: "failed", whatsapp_delivery_error: sent.error
              }).eq("id", guest.id);
              item.whatsapp = { ok: false, error: sent.error };
            }
          } catch (sendError) {
            await supabaseAdmin.from("e_card_guests").update({
              whatsapp_delivery_error: "Hali ya kutuma haijathibitishwa; kagua Meta kabla ya retry."
            }).eq("id", guest.id);
            item.whatsapp = { ok: false, uncertain: true, error: "Hali ya kutuma haijathibitishwa; imeachwa kwenye sending ili kuzuia kurudia." };
          }
        }
        results.push(item);
      }

      const sentSms = results.filter(x => x.sms?.ok).length;
      const sentWhatsapp = results.filter(x => x.whatsapp?.ok).length;
      return res.json({
        ok: true, cardId, selectedChannel: channel, attemptedGuests: results.length,
        smsAccepted: sentSms, whatsappAccepted: sentWhatsapp, results,
        smsCreditsReserved: claimedSms,
        note: "Retry inajaribu tu njia zenye hali pending au failed. Hali sending inahitaji ukaguzi wa provider kabla ya retry."
      });
    } catch (error) {
      console.error("[E-CARD DISTRIBUTION] Failed", { message: error.message });
      return res.status(500).json({ ok: false, error: "Usambazaji umekutana na hitilafu. Kagua hali za wageni kabla ya kujaribu tena." });
    }
  });
}
