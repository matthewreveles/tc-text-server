// src/services/smsSender.ts
import axios from "axios";
import twilioLib from "twilio";
import { normalizeUSPhone } from "./normalizePhone.js";
// ─────────────────────────────
// Environment configuration
// ─────────────────────────────
const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
const TELNYX_PROFILE_ID = process.env.TELNYX_MESSAGING_PROFILE_ID;
const TELNYX_FROM_NUMBER = process.env.TELNYX_FROM_NUMBER;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;
// Only initialize Twilio client if creds are present
const twilio = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilioLib(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;
// ─────────────────────────────
// Telnyx
// ─────────────────────────────
async function sendViaTelnyx(to, message) {
    if (!TELNYX_API_KEY || !TELNYX_PROFILE_ID || !TELNYX_FROM_NUMBER) {
        throw new Error("Telnyx configuration missing");
    }
    try {
        const resp = await axios.post("https://api.telnyx.com/v2/messages", {
            from: TELNYX_FROM_NUMBER,
            to,
            text: message,
            messaging_profile_id: TELNYX_PROFILE_ID,
        }, {
            headers: {
                Authorization: `Bearer ${TELNYX_API_KEY}`,
                "Content-Type": "application/json",
            },
            timeout: 15000,
        });
        if (resp.status >= 200 && resp.status < 300) {
            return {
                ok: true,
                provider: "telnyx",
                to,
            };
        }
        throw new Error(`Telnyx responded with status ${resp.status}`);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown Telnyx error";
        return {
            ok: false,
            provider: "telnyx",
            to,
            error: msg,
        };
    }
}
// ─────────────────────────────
// Twilio (fallback)
// ─────────────────────────────
async function sendViaTwilio(to, message) {
    if (!twilio || !TWILIO_FROM_NUMBER) {
        throw new Error("Twilio configuration missing");
    }
    try {
        await twilio.messages.create({
            to,
            from: TWILIO_FROM_NUMBER,
            body: message,
        });
        return {
            ok: true,
            provider: "twilio",
            to,
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown Twilio error";
        return {
            ok: false,
            provider: "twilio",
            to,
            error: msg,
        };
    }
}
// ─────────────────────────────
// Public API used by routes
// ─────────────────────────────
export async function sendSmsToNumber(rawTo, message) {
    const normalized = normalizeUSPhone(rawTo);
    // Guard against bad phone numbers from forms, etc.
    if (!normalized) {
        return {
            ok: false,
            provider: "telnyx", // first provider we *would* have used
            to: rawTo,
            error: "Invalid phone number",
        };
    }
    const to = normalized;
    // Try Telnyx first
    const telnyxResult = await sendViaTelnyx(to, message);
    if (telnyxResult.ok) {
        return telnyxResult;
    }
    // Fallback to Twilio if configured
    if (twilio) {
        const twilioResult = await sendViaTwilio(to, message);
        // Prefer Twilio success if it worked
        if (twilioResult.ok) {
            return twilioResult;
        }
        // Both failed; log and return Twilio's error
        console.error("[SMS FALLBACK ERROR]", {
            telnyxError: telnyxResult.error,
            twilioError: twilioResult.error,
        });
        return twilioResult;
    }
    // No Twilio configured and Telnyx failed
    return telnyxResult;
}
// Backwards-compat alias if any old code still calls sendSms()
export const sendSms = sendSmsToNumber;
