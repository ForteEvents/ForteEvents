import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

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

app.use(cors());
app.use(express.json());

// ------------------------------------
// BEEM CONFIGURATION
// ------------------------------------

const BEEM_API_KEY = process.env.BEEM_API_KEY?.trim();
const BEEM_SECRET_KEY = process.env.BEEM_SECRET_KEY?.trim();
const BEEM_SENDER_ID =
  process.env.BEEM_SENDER_ID?.trim() || "ForteEvents";

// ------------------------------------
// FORTEEVENTS CREDIT SYSTEM
// ------------------------------------
//
// Hii ni balance ya ForteEvents platform.
// Baadaye tutaunganisha na:
// - customer accounts
// - payments
// - SMS packages
// - automatic crediting
//
// Kwa sasa tunahifadhi credits kwenye file
// ili zisipotee server ikizimwa.
// ------------------------------------

const DATA_DIR = path.join(__dirname, "data");
const CREDIT_FILE = path.join(DATA_DIR, "credits.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(CREDIT_FILE)) {
  fs.writeFileSync(
    CREDIT_FILE,
    JSON.stringify(
      {
        platformBalance: 0,
        totalUsed: 0,
        transactions: []
      },
      null,
      2
    )
  );
}

function readCredits() {
  try {
    const data = fs.readFileSync(CREDIT_FILE, "utf8");

    return JSON.parse(data);
  } catch (error) {
    console.error("Credit file error:", error);

    return {
      platformBalance: 0,
      totalUsed: 0,
      transactions: []
    };
  }
}

function saveCredits(data) {
  fs.writeFileSync(
    CREDIT_FILE,
    JSON.stringify(data, null, 2)
  );
}

// ------------------------------------
// STARTUP LOG
// ------------------------------------

console.log("");
console.log("=================================");
console.log("FORTEEVENTS BACKEND");
console.log("=================================");
console.log("API KEY:", Boolean(BEEM_API_KEY));
console.log("SECRET:", Boolean(BEEM_SECRET_KEY));
console.log("SENDER:", BEEM_SENDER_ID);
console.log(
  "FORTEEVENTS CREDITS:",
  readCredits().platformBalance
);
console.log("=================================");
console.log("");

// ------------------------------------
// HOME
// ------------------------------------

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "ForteEvents backend iko online",
    port: PORT
  });
});

// ------------------------------------
// HEALTH
// ------------------------------------

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    online: true,
    beemApiKey: Boolean(BEEM_API_KEY),
    beemSecret: Boolean(BEEM_SECRET_KEY),
    sender: BEEM_SENDER_ID
  });
});

// ------------------------------------
// BEEM AUTH TEST
// ------------------------------------

app.get("/api/beem-status", async (req, res) => {
  if (!BEEM_API_KEY || !BEEM_SECRET_KEY) {
    return res.status(500).json({
      ok: false,
      error:
        "Beem credentials hazijawekwa kwenye server/.env"
    });
  }

  try {
    const credentials =
      `${BEEM_API_KEY}:${BEEM_SECRET_KEY}`;

    const authorization = Buffer
      .from(credentials, "utf8")
      .toString("base64");

    const response = await fetch(
      "https://apisms.beem.africa/v1/send",
      {
        method: "POST",

        headers: {
          Authorization: `Basic ${authorization}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          source_addr: BEEM_SENDER_ID,
          encoding: 0,
          schedule_time: "",
          message:
            "ForteEvents authentication test",
          recipients: []
        })
      }
    );

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = {
        raw: text
      };
    }

    return res.json({
      ok: response.ok,
      beemStatus: response.status,
      beemResponse: data
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ------------------------------------
// EVENTS
// ------------------------------------

let events = [];

app.get("/api/events", (req, res) => {
  res.json({
    ok: true,
    events
  });
});

app.post("/api/events", (req, res) => {
  const {
    name,
    date,
    location,
    type
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
        "Jaza taarifa zote za event."
    });
  }

  const event = {
    id: Date.now().toString(),
    name,
    date,
    location,
    type,
    createdAt:
      new Date().toISOString()
  };

  events.push(event);

  res.json({
    ok: true,
    event
  });
});

// ------------------------------------
// SMS HISTORY
// ------------------------------------

let smsHistory = [];

app.get("/api/sms/history", (req, res) => {
  res.json({
    ok: true,
    history: smsHistory
  });
});

// ------------------------------------
// FORTEEVENTS CREDIT BALANCE
// ------------------------------------

app.get("/api/sms/balance", (req, res) => {
  const credits = readCredits();

  res.json({
    ok: true,
    balance: credits.platformBalance,
    used: credits.totalUsed,
    source: "ForteEvents Credit System"
  });
});

// ------------------------------------
// ADD FORTEEVENTS CREDITS
// ------------------------------------
//
// Hii endpoint ni ya mfumo wetu wa ndani.
// Baadaye tutaiweka chini ya Admin authentication
// na payment verification.
// ------------------------------------

app.post("/api/admin/credits/add", (req, res) => {
  const {
    amount,
    reference
  } = req.body;

  const creditAmount = Number(amount);

  if (
    !Number.isFinite(creditAmount) ||
    creditAmount <= 0
  ) {
    return res.status(400).json({
      ok: false,
      error:
        "Credit amount lazima iwe namba kubwa kuliko 0."
    });
  }

  const credits = readCredits();

  credits.platformBalance += creditAmount;

  credits.transactions.push({
    id: Date.now().toString(),
    type: "CREDIT",
    amount: creditAmount,
    reference:
      reference || "Manual credit",
    createdAt:
      new Date().toISOString()
  });

  saveCredits(credits);

  res.json({
    ok: true,
    message:
      "ForteEvents credits zimeongezwa.",
    balance:
      credits.platformBalance
  });
});

// ------------------------------------
// SEND SMS THROUGH BEEM
// ------------------------------------

app.post("/api/sms/send", async (req, res) => {
  const {
    recipients,
    message,
    sender,
    eventId,
    eventName
  } = req.body;

  // -------------------------------
  // CREDENTIAL CHECK
  // -------------------------------

  if (
    !BEEM_API_KEY ||
    !BEEM_SECRET_KEY
  ) {
    return res.status(500).json({
      ok: false,
      error:
        "Beem credentials hazipo kwenye server/.env"
    });
  }

  // -------------------------------
  // RECIPIENT CHECK
  // -------------------------------

  if (
    !Array.isArray(recipients) ||
    recipients.length === 0
  ) {
    return res.status(400).json({
      ok: false,
      error:
        "Hakuna namba za kutuma SMS."
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
        "Ujumbe wa SMS haujawekwa."
    });
  }

  // -------------------------------
  // CREDIT CHECK
  // -------------------------------

  const credits = readCredits();

  const requiredCredits =
    recipients.length;

  if (
    credits.platformBalance <
    requiredCredits
  ) {
    return res.status(400).json({
      ok: false,
      error:
        "ForteEvents SMS credits hazitoshi.",
      balance:
        credits.platformBalance,
      required:
        requiredCredits
    });
  }

  try {

    // -----------------------------
    // FORMAT RECIPIENTS
    // -----------------------------

    const normalizedRecipients =
      recipients.map(
        (phone, index) => ({
          recipient_id:
            String(index + 1),

          dest_addr:
            String(phone).trim()
        })
      );

    // -----------------------------
    // AUTHORIZATION
    // -----------------------------

    const credentials =
      `${BEEM_API_KEY}:${BEEM_SECRET_KEY}`;

    const authorization =
      Buffer
        .from(credentials, "utf8")
        .toString("base64");

    // -----------------------------
    // PAYLOAD
    // -----------------------------

    const payload = {
      source_addr:
        sender || BEEM_SENDER_ID,

      encoding: 0,

      schedule_time: "",

      message:
        message.trim(),

      recipients:
        normalizedRecipients
    };

    console.log("");
    console.log(
      "Sending SMS to Beem..."
    );

    console.log(
      "Recipients:",
      normalizedRecipients.length
    );

    console.log(
      "Sender:",
      payload.source_addr
    );

    // -----------------------------
    // SEND TO BEEM
    // -----------------------------

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
              "application/json"
          },

          body:
            JSON.stringify(payload)
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
        raw: text
      };
    }

    console.log(
      "Beem HTTP status:",
      response.status
    );

    console.log(
      "Beem response:",
      beemData
    );

    // -----------------------------
    // BEEM REJECTED
    // -----------------------------

    if (!response.ok) {
      return res
        .status(response.status)
        .json({
          ok: false,

          error:
            "Beem imekataa ombi la SMS.",

          beemStatus:
            response.status,

          beemResponse:
            beemData
        });
    }

    // -----------------------------
    // ONLY DEDUCT AFTER BEEM ACCEPTS
    // -----------------------------

    const freshCredits =
      readCredits();

    freshCredits.platformBalance -=
      requiredCredits;

    freshCredits.totalUsed +=
      requiredCredits;

    freshCredits.transactions.push({
      id:
        Date.now().toString(),

      type:
        "SMS_USAGE",

      amount:
        -requiredCredits,

      eventId:
        eventId || null,

      eventName:
        eventName || null,

      recipients:
        requiredCredits,

      createdAt:
        new Date().toISOString(),

      beemResponse:
        beemData
    });

    saveCredits(
      freshCredits
    );

    // -----------------------------
    // SMS HISTORY
    // -----------------------------

    const historyItem = {
      id:
        Date.now().toString(),

      eventId:
        eventId || null,

      eventName:
        eventName || null,

      count:
        requiredCredits,

      createdAt:
        new Date().toISOString(),

      beemResponse:
        beemData
    };

    smsHistory.push(
      historyItem
    );

    // -----------------------------
    // SUCCESS
    // -----------------------------

    return res.json({
      ok: true,

      message:
        "SMS imetumwa kwa Beem.",

      count:
        requiredCredits,

      balance:
        freshCredits.platformBalance,

      used:
        freshCredits.totalUsed,

      beemResponse:
        beemData
    });

  } catch (error) {

    console.error(
      "SMS ERROR:",
      error
    );

    return res.status(500).json({
      ok: false,

      error:
        "Imeshindikana kuwasiliana na Beem.",

      details:
        error.message
    });
  }
});

// ------------------------------------
// START SERVER
// ------------------------------------

app.listen(
  PORT,
  () => {
    console.log("");
    console.log(
      `ForteEvents backend iko online kwenye port ${PORT}`
    );
    console.log("");
  }
);