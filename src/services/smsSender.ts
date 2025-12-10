// src/services/smsSender.ts
import axios from "axios";
import twilio from "twilio";
import { normalizeUSPhone } from "./normalizePhone";

const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
const TELNYX_FROM_NUMBER = process.env.TELNYX_FROM_NUMBER;
const TELNYX_MESSAGING_PROFILE_ID = process.env.TELNYX_MESSAGING_PROFILE_ID;

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export type SmsSendResult = {
  ok: boolean;
  provider: "telnyx" | "twilio";
  to: string;
  error?: any;
};

async function sendViaTelnyx(
  to: string,
  message: string
): Promise<SmsSendResult> {
  if (!TELNYX_API_KEY || !TELNYX_FROM_NUMBER || !TELNYX_MESSAGING_PROFILE_ID) {
    return {
      ok: false,
      provider: "telnyx",
      to,
      error: new Error("Telnyx not configured"),
    };
  }

  try {
    const url = "https://api.telnyx.com/v2/messages";

    await axios.post(
      url,
      {
        from: TELNYX_FROM_NUMBER,
        to,
        text: message,
        messaging_profile_id: TELNYX_MESSAGING_PROFILE_ID,
      },
      {
        headers: {
          Authorization: `Bearer ${TELNYX_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      ok: true,
      provider: "telnyx",
      to,
    };
  } catch (err: any) {
    console.error("[SMS][TELNYX_ERROR]", err?.response?.data || err?.message);

    return {
      ok: false,
      provider: "telnyx",
      to,
      error: err?.response?.data || err?.message || err,
    };
  }
}

async function sendViaTwilio(
  to: string,
  message: string
): Promise<SmsSendResult> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return {
      ok: false,
      provider: "twilio",
      to,
      error: new Error("Twilio not configured"),
    };
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  try {
    await client.messages.create({
      from: TWILIO_PHONE_NUMBER,
      to,
      body: message,
    });

    return {
      ok: true,
      provider: "twilio",
      to,
    };
  } catch (err: any) {
    console.error("[SMS][TWILIO_ERROR]", err?.message || err);

    return {
      ok: false,
      provider: "twilio",
      to,
      error: err?.message || err,
    };
  }
}

/**
 * Main entry point used by routes:
 * - normalizes the phone number
 * - validates that it’s usable
 * - tries Telnyx first, then Twilio as fallback
 */
export async function sendSmsToNumber(
  rawPhone: string,
  message: string
): Promise<SmsSendResult> {
  const normalized = normalizeUSPhone(rawPhone);

  // If we can't normalize, bail out cleanly (no null passed to providers)
  if (!normalized) {
    return {
      ok: false,
      provider: "telnyx", // arbitrary, just to fill the union
      to: rawPhone,
      error: new Error("Invalid or unsupported phone number"),
    };
  }

  const to = normalized;

  // Try Telnyx first
  const telnyxResult = await sendViaTelnyx(to, message);
  if (telnyxResult.ok) {
    return telnyxResult;
  }

  // Fallback to Twilio
  const twilioResult = await sendViaTwilio(to, message);
  return twilioResult;
}

// Optional alias to keep any old code happy
export const sendSms = sendSmsToNumber;
