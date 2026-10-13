import express from "express";

export function registerScheduledSms({
  app,
  requireAuth,
  supabaseAdmin,
}) {
  app.post(
    "/api/sms/schedule",
    requireAuth,
    async (req, res) => {
      try {
        const { recipients, message, scheduledAt, eventId } =
          req.body;

        if (!Array.isArray(recipients) || recipients.length === 0) {
          return res.status(400).json({
            ok: false,
            message: "Weka angalau mpokeaji mmoja.",
          });
        }

        if (recipients.length > 1000) {
          return res.status(400).json({
            ok: false,
            message: "Hairuhusiwi kuzidi wapokeaji 1000.",
          });
        }

        if (typeof message !== "string" || !message.trim()) {
          return res.status(400).json({
            ok: false,
            message: "Andika ujumbe wa SMS.",
          });
        }

        const scheduledDate = new Date(scheduledAt);

        if (
          !scheduledAt ||
          Number.isNaN(scheduledDate.getTime()) ||
          scheduledDate.getTime() <= Date.now()
        ) {
          return res.status(400).json({
            ok: false,
            message: "Chagua tarehe na muda wa baadaye.",
          });
        }

        const cleanRecipients = recipients
          .map((item) => ({
            name: String(item.name || "").trim(),
            phone: String(item.phone || "").trim(),
          }))
          .filter((item) => item.phone);

        if (cleanRecipients.length === 0) {
          return res.status(400).json({
            ok: false,
            message: "Hakuna namba sahihi za wapokeaji.",
          });
        }

        const { data, error } = await supabaseAdmin
          .from("scheduled_sms")
          .insert({
            user_id: req.user.id,
            event_id: eventId || null,
            message: message.trim(),
            recipients: cleanRecipients,
            scheduled_at: scheduledDate.toISOString(),
            total_recipients: cleanRecipients.length,
            status: "pending",
          })
          .select()
          .single();

        if (error) {
          console.error("SCHEDULE SMS SAVE ERROR:", error);
          return res.status(500).json({
            ok: false,
            message: "Imeshindikana kuhifadhi ratiba ya SMS.",
          });
        }

        return res.status(201).json({
          ok: true,
          message: "Ratiba ya SMS imehifadhiwa.",
          schedule: data,
        });
      } catch (error) {
        console.error("SCHEDULE SMS ERROR:", error);
        return res.status(500).json({
          ok: false,
          message: "Hitilafu imetokea wakati wa kupanga SMS.",
        });
      }
    }
  );

  app.get(
    "/api/sms/schedules",
    requireAuth,
    async (req, res) => {
      try {
        const { data, error } = await supabaseAdmin
          .from("scheduled_sms")
          .select("*")
          .eq("user_id", req.user.id)
          .order("scheduled_at", { ascending: true });

        if (error) {
          console.error("SCHEDULE SMS LIST ERROR:", error);
          return res.status(500).json({
            ok: false,
            message: "Imeshindikana kupata ratiba za SMS.",
          });
        }

        return res.json({
          ok: true,
          schedules: data || [],
        });
      } catch (error) {
        console.error("SCHEDULE SMS LIST ERROR:", error);
        return res.status(500).json({
          ok: false,
          message: "Hitilafu wakati wa kupata ratiba.",
        });
      }
    }
  );

  app.post(
    "/api/sms/schedules/:id/cancel",
    requireAuth,
    async (req, res) => {
      try {
        const { data, error } = await supabaseAdmin
          .from("scheduled_sms")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", req.params.id)
          .eq("user_id", req.user.id)
          .eq("status", "pending")
          .select()
          .maybeSingle();

        if (error) {
          console.error("CANCEL SCHEDULE ERROR:", error);
          return res.status(500).json({
            ok: false,
            message: "Imeshindikana kufuta ratiba.",
          });
        }

        if (!data) {
          return res.status(409).json({
            ok: false,
            message: "Ratiba haipo au tayari imeanza kutumwa.",
          });
        }

        return res.json({
          ok: true,
          message: "Ratiba imefutwa.",
          schedule: data,
        });
      } catch (error) {
        console.error("CANCEL SCHEDULE ERROR:", error);
        return res.status(500).json({
          ok: false,
          message: "Hitilafu wakati wa kufuta ratiba.",
        });
      }
    }
  );
}

export async function processDueSchedules({
  supabaseAdmin,
  BEEM_API_KEY,
  BEEM_SECRET_KEY,
  BEEM_SENDER_ID,
}) {
  if (!supabaseAdmin) {
    throw new Error("Supabase haijaunganishwa.");
  }

  const now = new Date().toISOString();

  const { data: dueSchedules, error: dueError } =
    await supabaseAdmin
      .from("scheduled_sms")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(10);

  if (dueError) {
    throw dueError;
  }

  const summary = {
    found: (dueSchedules || []).length,
    sent: 0,
    failed: 0,
  };

  for (const schedule of dueSchedules || []) {
    // Dai ratiba moja tu iweze kuanza kuchakatwa.
    const { data: claimed, error: claimError } =
      await supabaseAdmin
        .from("scheduled_sms")
        .update({
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", schedule.id)
        .eq("status", "pending")
        .lte("scheduled_at", new Date().toISOString())
        .select()
        .maybeSingle();

    if (claimError) {
      console.error("SCHEDULE CLAIM ERROR:", claimError);
      continue;
    }

    if (!claimed) {
      continue;
    }

    const recipients = Array.isArray(claimed.recipients)
      ? claimed.recipients
      : [];

    let sentCount = 0;
    let failedCount = 0;
    let errorMessage = null;
    let reserved = false;
    let reservedBalance = null;

    try {
      if (!BEEM_API_KEY || !BEEM_SECRET_KEY) {
        throw new Error("BEEM credentials hazijawekwa.");
      }

      if (recipients.length === 0) {
        throw new Error("Ratiba haina wapokeaji.");
      }

      // Hifadhi salio la sasa kabla ya kutoa credits.
      let balanceReserved = false;

      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: profile, error: profileError } =
          await supabaseAdmin
            .from("profiles")
            .select("sms_balance")
            .eq("id", claimed.user_id)
            .single();

        if (profileError || !profile) {
          throw new Error("Imeshindikana kusoma salio la mteja.");
        }

        const currentBalance = Number(profile.sms_balance || 0);

        if (currentBalance < recipients.length) {
          throw new Error(
            `Salio halitoshi. Zinahitajika SMS ${recipients.length}, salio ni ${currentBalance}.`
          );
        }

        const newBalance = currentBalance - recipients.length;

        const { data: updatedProfile, error: reserveError } =
          await supabaseAdmin
            .from("profiles")
            .update({
              sms_balance: newBalance,
              updated_at: new Date().toISOString(),
            })
            .eq("id", claimed.user_id)
            .eq("sms_balance", currentBalance)
            .select("sms_balance")
            .maybeSingle();

        if (reserveError) {
          throw reserveError;
        }

        if (updatedProfile) {
          reserved = true;
          reservedBalance = newBalance;
          balanceReserved = true;
          break;
        }
      }

      if (!balanceReserved) {
        throw new Error(
          "Salio linabadilika mara kwa mara. Jaribu kupanga SMS tena."
        );
      }

      const historyRows = [];

      for (let index = 0; index < recipients.length; index++) {
        const recipient = recipients[index];
        const phone = String(recipient.phone || "").trim();
        const name = String(recipient.name || "").trim();

        if (!phone) {
          failedCount++;
          continue;
        }

        const personalizedMessage = name
          ? `Habari ${name}, ${String(claimed.message).trim()}`
          : String(claimed.message).trim();

        try {
          const response = await fetch(
            "https://apisms.beem.africa/v1/send",
            {
              method: "POST",
              headers: {
                Authorization:
                  "Basic " +
                  Buffer.from(
                    `${BEEM_API_KEY}:${BEEM_SECRET_KEY}`
                  ).toString("base64"),
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                source_addr: BEEM_SENDER_ID || "ForteEvents",
                encoding: 0,
                schedule_time: "",
                message: personalizedMessage,
                recipients: [
                  {
                    recipient_id: String(index + 1),
                    dest_addr: phone,
                  },
                ],
              }),
            }
          );

          const responseText = await response.text();

          if (!response.ok) {
            failedCount++;
            errorMessage =
              `Beem ilikataa SMS kwa ${phone}. HTTP ${response.status}.`;
            console.error(
              "SCHEDULE BEEM ERROR:",
              response.status,
              responseText
            );
            continue;
          }

          sentCount++;

          historyRows.push({
            user_id: claimed.user_id,
            event_id: claimed.event_id || null,
            recipient: phone,
            message: personalizedMessage,
            sms_count: 1,
            status: "sent",
            error_message: null,
            sent_at: new Date().toISOString(),
          });
        } catch (sendError) {
          failedCount++;
          errorMessage =
            sendError.message || "Hitilafu ya kutuma SMS kupitia Beem.";

          console.error("SCHEDULE SEND ERROR:", sendError);
        }
      }

      // Hifadhi SMS zilizotumwa kwenye historia.
      if (historyRows.length > 0) {
        const { error: historyError } = await supabaseAdmin
          .from("sms_history")
          .insert(historyRows);

        if (historyError) {
          console.error("SCHEDULE HISTORY SAVE ERROR:", historyError);
          errorMessage =
            "Baadhi ya SMS zimetumwa lakini historia haijahifadhiwa vizuri.";
        }
      }

      // Rudisha credits za SMS zilizoshindwa.
      if (reserved && failedCount > 0) {
        let refunded = false;

        for (let attempt = 0; attempt < 5; attempt++) {
          const { data: profile, error: readError } =
            await supabaseAdmin
              .from("profiles")
              .select("sms_balance")
              .eq("id", claimed.user_id)
              .single();

          if (readError || !profile) {
            break;
          }

          const currentBalance = Number(profile.sms_balance || 0);

          const { data: refundData, error: refundError } =
            await supabaseAdmin
              .from("profiles")
              .update({
                sms_balance: currentBalance + failedCount,
                updated_at: new Date().toISOString(),
              })
              .eq("id", claimed.user_id)
              .eq("sms_balance", currentBalance)
              .select("sms_balance")
              .maybeSingle();

          if (!refundError && refundData) {
            refunded = true;
            break;
          }
        }

        if (!refunded) {
          errorMessage =
            "MUHIMU: SMS zilishindwa na mfumo umeshindwa kuthibitisha kurejeshwa kwa credits. Kagua salio la mteja.";
          console.error(
            "SCHEDULE REFUND NEEDS REVIEW:",
            claimed.id,
            failedCount
          );
        }
      }

      const finalStatus = sentCount > 0 ? "sent" : "failed";

      const { error: finishError } = await supabaseAdmin
        .from("scheduled_sms")
        .update({
          status: finalStatus,
          sent_count: sentCount,
          failed_count: failedCount,
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("id", claimed.id)
        .eq("status", "processing");

      if (finishError) {
        throw finishError;
      }

      summary.sent += sentCount;
      summary.failed += failedCount;
    } catch (error) {
      console.error("SCHEDULE PROCESS ERROR:", claimed.id, error);

      // Ikiwa bado hatujatoa credits, ratiba inaweza kufungwa salama.
      // Ikiwa tayari tumetoa credits, hatujaribu kutuma tena
      // moja kwa moja ili kuepuka kutuma SMS mara mbili.
      await supabaseAdmin
        .from("scheduled_sms")
        .update({
          status: "failed",
          failed_count: recipients.length,
          error_message: error.message || "Ratiba imeshindwa.",
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("id", claimed.id)
        .eq("status", "processing");

      summary.failed += recipients.length;
    }
  }

  console.log("SCHEDULED SMS SUMMARY:", summary);

  return summary;
}
