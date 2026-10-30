import { countSmsParts } from "./sms-utils.js";
import express from "express";
import whatsappWebhook from "./whatsapp-webhook.js";
import { registerScheduledSms } from "./scheduled-sms.js";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ------------------------------------
// ENVIRONMENT
// ------------------------------------

dotenv.config({
  path: path.join(__dirname, ".env"),
});

const app = express();

const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: true,
  })
);

app.use(express.json());

// Temporary, privacy-safe diagnostics for SMS Contacts only.
// Runs before requireAuth so 401 responses are visible in Render logs.
// Never log authorization values, contact names, or phone numbers.
app.use("/api/sms/contacts", (req, res, next) => {
  const startedAt = Date.now();
  console.log("[SMS CONTACTS REQUEST]", {
    method: req.method,
    path: req.path,
    authorizationPresent: Boolean(req.headers.authorization),
  });
  res.on("finish", () => {
    console.log("[SMS CONTACTS RESPONSE]", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });
  next();
});

app.use("/api/whatsapp/webhook", whatsappWebhook);

// ------------------------------------
// BEEM CONFIGURATION
// ------------------------------------

const BEEM_API_KEY =
  process.env.BEEM_API_KEY?.trim();

const BEEM_SECRET_KEY =
  process.env.BEEM_SECRET_KEY?.trim();

const BEEM_SENDER_ID =
  process.env.BEEM_SENDER_ID?.trim() ||
  "ForteEvents";

// ------------------------------------
// SUPABASE CONFIGURATION
// ------------------------------------

const SUPABASE_URL =
  process.env.SUPABASE_URL?.trim();

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY
) {
  console.error(
    "WARNING: Supabase server credentials hazijawekwa."
  );
}

const supabaseAdmin =
  SUPABASE_URL &&
  SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )
    : null;

// ------------------------------------
// STARTUP LOG
// ------------------------------------

console.log("");
console.log("=================================");
console.log("FORTEEVENTS BACKEND");
console.log("=================================");
console.log(
  "BEEM API KEY:",
  Boolean(BEEM_API_KEY)
);
console.log(
  "BEEM SECRET:",
  Boolean(BEEM_SECRET_KEY)
);
console.log(
  "BEEM SENDER:",
  BEEM_SENDER_ID
);
console.log(
  "SUPABASE:",
  Boolean(supabaseAdmin)
);
console.log("=================================");
console.log("");

// ------------------------------------
// AUTHENTICATION MIDDLEWARE
// ------------------------------------

async function requireAuth(
  req,
  res,
  next
) {
  if (!supabaseAdmin) {
    return res.status(500).json({
      ok: false,
      error:
        "Supabase server configuration haijawekwa.",
    });
  }

  const authorization =
    req.headers.authorization || "";

  if (
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return res.status(401).json({
      ok: false,
      error:
        "Login inahitajika.",
    });
  }

  const token =
    authorization
      .slice(7)
      .trim();

  if (!token) {
    return res.status(401).json({
      ok: false,
      error:
        "Access token haipo.",
    });
  }

  try {
    const {
      data,
      error,
    } =
      await supabaseAdmin.auth.getUser(
        token
      );

    if (
      error ||
      !data?.user
    ) {
      return res.status(401).json({
        ok: false,
        error:
          "Session ya Login si sahihi au ime-expire.",
      });
    }

    req.user = data.user;

    next();
  } catch (error) {
    console.error(
      "AUTH ERROR:",
      error
    );

    return res.status(401).json({
      ok: false,
      error:
        "Imeshindikana kuthibitisha Login.",
    });
  }
}

// ------------------------------------
registerScheduledSms({ app, requireAuth, supabaseAdmin });

// ADMIN AUTHENTICATION
// ------------------------------------

async function requireAdmin(
  req,
  res,
  next
) {
  await requireAuth(
    req,
    res,
    async () => {
      try {
        const {
          data: profile,
          error,
        } =
          await supabaseAdmin
            .from("profiles")
            .select("id, role")
            .eq(
              "id",
              req.user.id
            )
            .maybeSingle();

        if (error) {
          console.error(
            "ADMIN PROFILE ERROR:",
            error
          );

          return res.status(500).json({
            ok: false,
            error:
              "Imeshindikana kukagua admin account.",
          });
        }

        if (
          !profile ||
          profile.role !== "admin"
        ) {
          return res.status(403).json({
            ok: false,
            error:
              "Huna ruhusa ya Admin.",
          });
        }

        req.profile = profile;

        next();
      } catch (error) {
        console.error(
          "ADMIN AUTH ERROR:",
          error
        );

        return res.status(500).json({
          ok: false,
          error:
            "Admin authorization failed.",
        });
      }
    }
  );
}

// ------------------------------------
// HOME
// ------------------------------------

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message:
      "ForteEvents backend iko online",
    port: PORT,
  });
});

// ------------------------------------
// HEALTH
// ------------------------------------

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      ok: true,
      online: true,
      beemApiKey:
        Boolean(BEEM_API_KEY),
      beemSecret:
        Boolean(BEEM_SECRET_KEY),
      sender:
        BEEM_SENDER_ID,
      supabase:
        Boolean(supabaseAdmin),
    });
  }
);

// ------------------------------------
// BEEM STATUS
// ------------------------------------

app.get(
  "/api/beem-status",
  async (req, res) => {
    if (
      !BEEM_API_KEY ||
      !BEEM_SECRET_KEY
    ) {
      return res.status(500).json({
        ok: false,
        error:
          "Beem credentials hazijawekwa kwenye server/.env",
      });
    }

    try {
      const credentials =
        `${BEEM_API_KEY}:${BEEM_SECRET_KEY}`;

      const authorization =
        Buffer.from(
          credentials,
          "utf8"
        ).toString("base64");

      const response =
        await fetch(
          "https://apisms.beem.africa/v1/send",
          {
            method: "POST",

            headers: {
              Authorization:
                `Basic ${authorization}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              source_addr:
                BEEM_SENDER_ID,

              encoding: 0,

              schedule_time: "",

              message:
                "ForteEvents authentication test",

              recipients: [],
            }),
          }
        );

      const text =
        await response.text();

      let data;

      try {
        data =
          JSON.parse(text);
      } catch {
        data = {
          raw: text,
        };
      }

      return res.json({
        ok: response.ok,
        beemStatus:
          response.status,
        beemResponse:
          data,
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error:
          error.message,
      });
    }
  }
);

// ------------------------------------
// EVENTS
// ------------------------------------
// Hizi endpoints zimeachwa kwa compatibility.
// Mfumo mkuu wa events tayari unatumia Supabase.

let events = [];

app.get(
  "/api/events",
  requireAuth,
  (req, res) => {
    res.json({
      ok: true,
      events,
    });
  }
);

app.post(
  "/api/events",
  requireAuth,
  (req, res) => {
    const {
      name,
      date,
      location,
      type,
    } = req.body;

    if (
      !name ||
      !date ||
      !location ||
      !type
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Jaza taarifa zote za event.",
      });
    }

    const event = {
      id:
        Date.now().toString(),

      userId:
        req.user.id,

      name,
      date,
      location,
      type,

      createdAt:
        new Date().toISOString(),
    };

    events.push(event);

    res.json({
      ok: true,
      event,
    });
  }
);

// ------------------------------------
// ------------------------------------
// CUSTOMER SMS CONTACTS
// ------------------------------------
app.get(
  "/api/sms/contacts",
  requireAuth,
  async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("sms_contacts")
        .select("id, name, phone, created_at")
        .eq("user_id", req.user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return res.json({ ok: true, contacts: data || [] });
    } catch (error) {
      console.error("LOAD SMS CONTACTS ERROR:", error.message);
      return res.status(500).json({
        ok: false,
        message: "Imeshindikana kupakia contacts."
      });
    }
  }
);

app.post(
  "/api/sms/contacts",
  requireAuth,
  async (req, res) => {
    try {
      console.log("[CONTACTS DIAG] POST route reached", {
        userId: req.user?.id,
        bodyKeys: Object.keys(req.body || {}),
      });
      const input = Array.isArray(req.body.contacts)
        ? req.body.contacts
        : [req.body];

      const contacts = input
        .map((item) => ({
          user_id: req.user.id,
          name: String(item.name || "").trim(),
          phone: String(item.phone || "").trim()
        }))
        .filter((item) => item.phone);

      if (!contacts.length) {
        return res.status(400).json({
          ok: false,
          message: "Weka angalau namba moja."
        });
      }

      if (contacts.length > 1000) {
        return res.status(400).json({
          ok: false,
          message: "Hifadhi contacts zisizozidi 1000 kwa mara moja."
        });
      }

      const { data, error } = await supabaseAdmin
        .from("sms_contacts")
        .upsert(contacts, {
          onConflict: "user_id,phone"
        })
        .select("id, name, phone, created_at");

      if (error) {
        console.error("[CONTACTS DIAG] Supabase rejected save", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      console.log("[CONTACTS DIAG] Supabase save completed", {
        returnedRows: data?.length || 0,
        userId: req.user?.id,
      });

      return res.json({
        ok: true,
        message: "Contacts zimehifadhiwa.",
        contacts: data || []
      });
    } catch (error) {
      console.error("SAVE SMS CONTACTS ERROR:", error);
      return res.status(500).json({
        ok: false,
        message: "Imeshindikana kuhifadhi contacts.",
        details: error.message || String(error)
      });
    }
  }
);

app.put(
  "/api/sms/contacts/:id",
  requireAuth,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const name = String(req.body.name || "").trim();
      const phone = String(req.body.phone || "").trim();
      if (!Number.isSafeInteger(id) || id <= 0 || !name || !phone) {
        return res.status(400).json({ ok: false, message: "Weka contact ID, jina na namba sahihi." });
      }
      const { data, error } = await supabaseAdmin
        .from("sms_contacts")
        .update({ name, phone })
        .eq("id", id)
        .eq("user_id", req.user.id)
        .select("id, name, phone, created_at")
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ ok: false, message: "Contact haijapatikana." });
      return res.json({ ok: true, message: "Contact imebadilishwa.", contact: data });
    } catch (error) {
      console.error("UPDATE SMS CONTACT ERROR:", error.message);
      return res.status(500).json({ ok: false, message: "Imeshindikana kubadilisha contact." });
    }
  }
);

app.delete(
  "/api/sms/contacts/:id",
  requireAuth,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
          ok: false,
          message: "Contact ID si sahihi."
        });
      }

      const { error } = await supabaseAdmin
        .from("sms_contacts")
        .delete()
        .eq("id", id)
        .eq("user_id", req.user.id);

      if (error) throw error;

      return res.json({ ok: true, message: "Contact imefutwa." });
    } catch (error) {
      console.error("DELETE SMS CONTACT ERROR:", error.message);
      return res.status(500).json({
        ok: false,
        message: "Imeshindikana kufuta contact."
      });
    }
  }
);

// ------------------------------------
// SMS HISTORY
// ------------------------------------
// Kwa sasa history ya zamani inabaki memory.
// Tutaiunganisha na sms_history ya Supabase
// baada ya kuthibitisha columns zake.

let smsHistory = [];

app.get(
  "/api/sms/history",
  requireAuth,
  async (req, res) => {
    try {
      const {
        data: history,
        error,
      } = await supabaseAdmin
        .from("sms_history")
        .select(
          "id, user_id, event_id, recipient, message, sms_count, status, error_message, sent_at, created_at"
        )
        .eq(
          "user_id",
          req.user.id
        )
        .order(
          "sent_at",
          {
            ascending: false,
          }
        );

      if (error) {
        console.error(
          "CUSTOMER SMS HISTORY ERROR:",
          error
        );

        return res.status(500).json({
          ok: false,
          error:
            "Imeshindikana kupakia SMS history.",
        });
      }

      return res.json({
        ok: true,
        history:
          history || [],
      });
    } catch (error) {
      console.error(
        "CUSTOMER SMS HISTORY SERVER ERROR:",
        error
      );

      return res.status(500).json({
        ok: false,
        error:
          "Imeshindikana kupakia SMS history.",
      });
    }
  }
);

// ------------------------------------
// CUSTOMER SMS BALANCE
// ------------------------------------

app.get(
  "/api/sms/balance",
  requireAuth,
  async (req, res) => {
    try {
      const {
        data: profile,
        error,
      } =
        await supabaseAdmin
          .from("profiles")
          .select(
            "id, sms_balance"
          )
          .eq(
            "id",
            req.user.id
          )
          .maybeSingle();

      if (error) {
        console.error(
          "BALANCE ERROR:",
          error
        );

        return res.status(500).json({
          ok: false,
          error:
            "Imeshindikana kusoma SMS balance.",
        });
      }

      if (!profile) {
        return res.status(404).json({
          ok: false,
          error:
            "Customer profile haijapatikana.",
        });
      }

      const balance =
        Number(
          profile.sms_balance || 0
        );

      return res.json({
        ok: true,
        balance,
        userId:
          req.user.id,
        source:
          "Customer Supabase Profile",
      });
    } catch (error) {
      console.error(
        "BALANCE SERVER ERROR:",
        error
      );

      return res.status(500).json({
        ok: false,
        error:
          "Server error wakati wa kusoma balance.",
      });
    }
  }
);

// ------------------------------------
// ADMIN: ADD CUSTOMER CREDITS
// ------------------------------------

app.post(
  "/api/admin/credits/add",
  requireAdmin,
  async (req, res) => {
    const {
      userId,
      amount,
      reference,
    } = req.body;

    const creditAmount =
      Number(amount);

    if (
      !userId ||
      !Number.isFinite(
        creditAmount
      ) ||
      creditAmount <= 0
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Tuma userId na amount kubwa kuliko 0.",
      });
    }

    try {
      const {
        data: customer,
        error:
          customerError,
      } =
        await supabaseAdmin
          .from("profiles")
          .select(
            "id, full_name, email, sms_balance"
          )
          .eq(
            "id",
            userId
          )
          .maybeSingle();

      if (customerError) {
        return res.status(500).json({
          ok: false,
          error:
            customerError.message,
        });
      }

      if (!customer) {
        return res.status(404).json({
          ok: false,
          error:
            "Customer hajapatikana.",
        });
      }

      const oldBalance =
        Number(
          customer.sms_balance || 0
        );

      const newBalance =
        oldBalance +
        creditAmount;

      const {
        data: updated,
        error:
          updateError,
      } =
        await supabaseAdmin
          .from("profiles")
          .update({
            sms_balance:
              newBalance,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            userId
          )
          .select(
            "id, full_name, email, sms_balance"
          )
          .single();

      if (updateError) {
        return res.status(500).json({
          ok: false,
          error:
            updateError.message,
        });
      }

      return res.json({
        ok: true,

        message:
          "Customer SMS credits zimeongezwa.",

        customer:
          updated,

        added:
          creditAmount,

        previousBalance:
          oldBalance,

        balance:
          Number(
            updated.sms_balance
          ),

        reference:
          reference ||
          "Admin credit",
      });
    } catch (error) {
      console.error(
        "ADMIN CREDIT ERROR:",
        error
      );

      return res.status(500).json({
        ok: false,
        error:
          "Imeshindikana kuongeza credits.",
      });
    }
}
);

// ------------------------------------
// ADMIN: GET CUSTOMERS
// ------------------------------------

app.get(
  "/api/admin/customers",
  requireAdmin,
  async (req, res) => {
    try {
      const {
        data: customers,
        error,
      } = await supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, email, phone, sms_balance, role, created_at"
        )
        .eq(
          "role",
          "customer"
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (error) {
        console.error(
          "ADMIN CUSTOMERS ERROR:",
          error
        );

        return res.status(500).json({
          ok: false,
          error:
            error.message,
        });
      }

      return res.json({
        ok: true,
        customers:
          customers || [],
      });
    } catch (error) {
      console.error(
        "ADMIN CUSTOMERS SERVER ERROR:",
        error
      );

      return res.status(500).json({
        ok: false,
        error:
          "Imeshindikana kupakia customers.",
      });
    }
  }
);

// ------------------------------------
// ADMIN: GET CUSTOMER SMS HISTORY
// ------------------------------------

app.get(
  "/api/admin/customers/:customerId/sms-history",
  requireAdmin,
  async (req, res) => {
    try {
      const {
        customerId,
      } = req.params;

      const {
        data: history,
        error,
      } = await supabaseAdmin
        .from("sms_history")
        .select(
          "id, user_id, event_id, recipient, message, sms_count, status, error_message, sent_at, created_at"
        )
        .eq(
          "user_id",
          customerId
        )
        .order(
          "sent_at",
          {
            ascending: false,
          }
        );

      if (error) {
        console.error(
          "ADMIN SMS HISTORY ERROR:",
          error
        );

        return res.status(500).json({
          ok: false,
          error:
            error.message,
        });
      }

      return res.json({
        ok: true,
        history:
          history || [],
      });
    } catch (error) {
      console.error(
        "ADMIN SMS HISTORY SERVER ERROR:",
        error
      );

      return res.status(500).json({
        ok: false,
        error:
          "Imeshindikana kupakia SMS history.",
      });
    }
  }
);

// ------------------------------------
// REFUND SMS CREDITS
// ------------------------------------
// Internal helper.
// Inatumika pale Beem ikikataa SMS
// baada ya credits kuwa reserved.

async function refundCredits(
  userId,
  amount
) {
  const {
    data: profile,
    error:
      readError,
  } =
    await supabaseAdmin
      .from("profiles")
      .select(
        "sms_balance"
      )
      .eq(
        "id",
        userId
      )
      .single();

  if (readError) {
    throw readError;
  }

  const currentBalance =
    Number(
      profile.sms_balance || 0
    );

  const newBalance =
    currentBalance +
    amount;

  const {
    error:
      updateError,
  } =
    await supabaseAdmin
      .from("profiles")
      .update({
        sms_balance:
          newBalance,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        userId
      );

  if (updateError) {
    throw updateError;
  }

  return newBalance;
}

// ------------------------------------
// SEND SMS THROUGH BEEM
// ------------------------------------

app.post(
  "/api/sms/send",
  requireAuth,
  async (req, res) => {
    const {
      recipients,
      message,
      sender,
      eventId,
      eventName,
      personalizedMessages,
    } = req.body;

    // -------------------------------
    // BEEM CREDENTIAL CHECK
    // -------------------------------

    if (
      !BEEM_API_KEY ||
      !BEEM_SECRET_KEY
    ) {
      return res.status(500).json({
        ok: false,
        error:
          "Beem credentials hazipo kwenye server/.env",
      });
    }

    // -------------------------------
    // RECIPIENT CHECK
    // -------------------------------

    if (
      !Array.isArray(
        recipients
      ) ||
      recipients.length === 0
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Hakuna namba za kutuma SMS.",
      });
    }

    // -------------------------------
    // MESSAGE CHECK
    // -------------------------------

    if (
      !message ||
      !message.trim()
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Ujumbe wa SMS haujawekwa.",
      });
    }

    // -------------------------------
    // LIMIT
    // -------------------------------

    if (
      recipients.length > 1000
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Kwa sasa SMS moja haiwezi kuzidi recipients 1000.",
      });
    }

    const customMessages = Array.isArray(personalizedMessages)
      ? personalizedMessages
      : [];

    const requiredCredits =
      recipients.reduce((total, recipient, index) => {
        const custom = customMessages[index];
        const useCustom =
          custom &&
          String(custom.phone || "").trim() === String(recipient.phone || "").trim() &&
          typeof custom.message === "string" &&
          custom.message.trim();

        let finalMessage = useCustom
          ? custom.message.trim()
          : message.trim();

        if (!useCustom) {
          const recipientName = String(recipient.name || "").trim();
          if (recipientName) {
            finalMessage = `Habari ${recipientName}, ${finalMessage}`;
          }
        }

        return total + countSmsParts(finalMessage);
      }, 0);

    let reservedBalance =
      null;

    // Credits za maombi yaliyoanzishwa kwa Beem.
    let attemptedCredits = 0;

    // -------------------------------
    // RESERVE CUSTOMER CREDITS
    // -------------------------------
    // Hii inafanyika kabla ya Beem.
    // Update ina condition ya balance,
    // hivyo customer hawezi kutumia
    // credits ambazo hana.

    try {
      const {
        data: currentProfile,
        error:
          profileError,
      } =
        await supabaseAdmin
          .from("profiles")
          .select(
            "id, sms_balance"
          )
          .eq(
            "id",
            req.user.id
          )
          .maybeSingle();

      if (profileError) {
        return res.status(500).json({
          ok: false,
          error:
            "Imeshindikana kusoma customer balance.",
        });
      }

      if (!currentProfile) {
        return res.status(404).json({
          ok: false,
          error:
            "Customer profile haijapatikana.",
        });
      }

console.log(
  "CUSTOMER PROFILE:",
  currentProfile
);
      const currentBalance =
        Number(
          currentProfile.sms_balance ||
            0
        );

      if (
        currentBalance <
        requiredCredits
      ) {
        return res.status(400).json({
          ok: false,

          error:
            "SMS credits zako hazitoshi.",

          balance:
            currentBalance,

          required:
            requiredCredits,
        });
      }

      const newBalance =
        currentBalance -
        requiredCredits;

      const {
        data: updatedProfile,
        error:
          reserveError,
      } =
        await supabaseAdmin
          .from("profiles")
          .update({
            sms_balance:
              newBalance,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            req.user.id
          )
          .gte(
            "sms_balance",
            requiredCredits
          )
          .select(
            "id, sms_balance"
          )
          .maybeSingle();

      if (
        reserveError
      ) {
        console.error(
          "CREDIT RESERVE ERROR:",
          reserveError
        );

        return res.status(500).json({
          ok: false,
          error:
            "Imeshindikana kuhifadhi SMS credits.",
        });
      }

      if (
        !updatedProfile
      ) {
        return res.status(409).json({
          ok: false,
          error:
            "SMS credits zimebadilika. Tafadhali jaribu tena.",
        });
      }

      reservedBalance =
        Number(
          updatedProfile.sms_balance
        );
    } catch (error) {
      console.error(
        "CREDIT CHECK ERROR:",
        error
      );

      return res.status(500).json({
        ok: false,
        error:
          "Imeshindikana kukagua SMS credits.",
      });
    }

    // -------------------------------
    // SEND TO BEEM
    // -------------------------------

    try {
      const normalizedRecipients =
        recipients.map((recipient, index) => {
          const custom = customMessages[index];
          const useCustom =
            custom &&
            String(custom.phone || "").trim() === String(recipient.phone || "").trim() &&
            typeof custom.message === "string" &&
            custom.message.trim();

          return {
            recipient_id: String(index + 1),
            dest_addr: String(recipient.phone).trim(),
            name: String(recipient.name || "").trim(),
            customMessage: useCustom ? custom.message.trim() : null,
          };
        });

      const credentials =
        `${BEEM_API_KEY}:${BEEM_SECRET_KEY}`;

      const authorization =
        Buffer.from(
          credentials,
          "utf8"
        ).toString("base64");

      const sentRecipients = [];
      const failedRecipients = [];

      for (const recipient of normalizedRecipients) {
        let personalizedMessage =
          recipient.customMessage || message.trim();

        if (!recipient.customMessage && recipient.name) {
          personalizedMessage =
            `Habari ${recipient.name}, ${personalizedMessage}`;
        }

        const smsCount = countSmsParts(personalizedMessage);

        const payload = {
          source_addr:
            sender ||
            BEEM_SENDER_ID,

          encoding: 0,

          schedule_time: "",

          message:
            personalizedMessage,

          recipients: [
            {
              recipient_id:
                recipient.recipient_id,

              dest_addr:
                recipient.dest_addr,
            },
          ],
        };

        console.log("");
        console.log(
          "Sending customer SMS to Beem..."
        );
        console.log(
          "Customer:",
          req.user.id
        );
        console.log(
          "Recipient:",
          recipient.dest_addr
        );
        console.log(
          "Name:",
          recipient.name
        );
        console.log(
          "Message:",
          personalizedMessage
        );
        console.log(
          "Sender:",
          payload.source_addr
        );

        // Ongeza kabla ya ombi: hitilafu ya mtandao
        // inaweza kuacha hali ya ujumbe bila uhakika.
        attemptedCredits += smsCount;

        const response =
          await fetch(
            "https://apisms.beem.africa/v1/send",
            {
              method: "POST",

              headers: {
                Authorization:
                  `Basic ${authorization}`,

                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              body:
                JSON.stringify(
                  payload
                ),
            }
          );

        const text =
          await response.text();

        let beemData;

        try {
          beemData =
            JSON.parse(text);
        } catch {
          beemData = {
            raw: text,
          };
        }

        if (response.ok) {
          sentRecipients.push({
            recipient,
            message: personalizedMessage,
            smsCount,
            beemData,
          });
        } else {
          failedRecipients.push({
            recipient,
            message: personalizedMessage,
            smsCount,
            error: beemData,
          });
        }
      }

      const failedCount = failedRecipients.length;

      const refundedCredits = failedRecipients.reduce(
        (total, item) => total + item.smsCount,
        0
      );

      if (refundedCredits > 0) {
        try {
          const refundedBalance = await refundCredits(
            req.user.id,
            refundedCredits
          );

          console.log(
            "Refunded failed SMS credits:",
            refundedCredits
          );

          console.log(
            "Balance after refund:",
            refundedBalance
          );
        } catch (refundError) {
          console.error("REFUND FAILED:", refundError);
        }
      }

      const finalBalance = reservedBalance + refundedCredits;

      // -----------------------------
      // SAVE SMS HISTORY TO SUPABASE
      // -----------------------------

      if (sentRecipients.length > 0) {
        const historyRows =
          sentRecipients.map(
            (item) => ({
              id:
                Date.now() +
                Math.floor(
                  Math.random() * 1000
                ),

              user_id:
                req.user.id,

              event_id:
                eventId || null,

              recipient:
                item.recipient.dest_addr,

              message:
                item.message,

              sms_count:
                item.smsCount,

              status:
                "sent",

              error_message:
                null,

              sent_at:
                new Date().toISOString(),
            })
          );

        const { error: historyError } =
          await supabaseAdmin
            .from("sms_history")
            .insert(historyRows);

        if (historyError) {
          console.error(
            "SMS HISTORY SAVE ERROR:",
            historyError
          );
        }
      }

      return res.json({
        ok: true,

        message:
          failedCount > 0
            ? "SMS zimetumwa kwa mafanikio kwa baadhi ya wapokeaji."
            : "SMS zimetumwa kikamilifu.",

        balance:
          finalBalance,

        used:
          requiredCredits - refundedCredits,

        recipients:
          normalizedRecipients.length,

        sent:
          sentRecipients.length,

        failed:
          failedRecipients.length,

        eventId:
          eventId || null,

        eventName:
          eventName || null,

        results:
          {
            sent:
              sentRecipients.map(
                (item) => ({
                  name:
                    item.recipient.name,

                  phone:
                    item.recipient.dest_addr,

                  message:
                    item.message,
                })
              ),

            failed:
              failedRecipients.map(
                (item) => ({
                  name:
                    item.recipient.name,

                  phone:
                    item.recipient.dest_addr,

                  error:
                    item.error,
                })
              ),
          },
      });

    } catch (error) {
      console.error(
        "SMS SEND ERROR:",
        error
      );

      const creditsNotAttempted = Math.max(
        0,
        requiredCredits - attemptedCredits
      );

      if (
        reservedBalance !== null &&
        creditsNotAttempted > 0
      ) {
        try {
          const refundedBalance =
            await refundCredits(
              req.user.id,
              creditsNotAttempted
            );

          console.log(
            "Credits refunded for SMS not attempted:",
            creditsNotAttempted,
            "Balance:",
            refundedBalance
          );
        } catch (refundError) {
          console.error(
            "REFUND AFTER SERVER ERROR:",
            refundError
          );
        }
      }

      return res.status(500).json({
        ok: false,
        error:
          "Imeshindikana kutuma SMS.",
        details:
          error.message,
      });
    }
  }
);

// ------------------------------------
// SERVER START
// ------------------------------------


app.listen(
  PORT,
  () => {
    console.log(
      "================================="
    );

    console.log(
      "FORTEVENTS BACKEND"
    );

    console.log(
      "================================="
    );

    console.log(
      "API KEY:",
      Boolean(
        BEEM_API_KEY
      )
    );

    console.log(
      "SECRET:",
      Boolean(
        BEEM_SECRET_KEY
      )
    );

    console.log(
      "SENDER:",
      BEEM_SENDER_ID
    );

    console.log(
      "================================="
    );

    console.log(
      `ForteEvents backend iko online kwenye port ${PORT}`
    );
  }
);