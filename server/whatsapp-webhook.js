import express from "express";

const router = express.Router();

const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN?.trim();

router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    VERIFY_TOKEN &&
    token === VERIFY_TOKEN &&
    challenge
  ) {
    console.log("WhatsApp webhook verified.");
    return res.status(200).type("text/plain").send(challenge);
  }

  return res.sendStatus(403);
});

router.post("/", (req, res) => {
  try {
    const body = req.body;

    if (body?.object === "whatsapp_business_account") {
      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          if (change.field === "messages") {
            console.log(
              "WhatsApp webhook event received."
            );

            // Tutakuongeza usindikaji wa ujumbe na
            // delivery status katika hatua inayofuata.
          }
        }
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("WhatsApp webhook error:", error.message);
    return res.sendStatus(500);
  }
});

export default router;
