import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { processDueSchedules } from "./scheduled-sms.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, ".env"),
});

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Worker: Supabase credentials hazipo.");
  process.exit(1);
}

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

try {
  await processDueSchedules({
    supabaseAdmin,
    BEEM_API_KEY: process.env.BEEM_API_KEY?.trim(),
    BEEM_SECRET_KEY: process.env.BEEM_SECRET_KEY?.trim(),
    BEEM_SENDER_ID:
      process.env.BEEM_SENDER_ID?.trim() || "ForteEvents",
  });
} catch (error) {
  console.error("SCHEDULED SMS WORKER FAILED:", error);
  process.exitCode = 1;
}
