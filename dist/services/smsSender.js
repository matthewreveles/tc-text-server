"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSms = sendSms;
// src/services/smsSender.ts
const axios_1 = __importDefault(require("axios"));
const twilio_1 = __importDefault(require("twilio"));
const normalizePhone_1 = require("./normalizePhone");
const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
const TELNYX_FROM_NUMBER = process.env.TELNYX_FROM_NUMBER;
const TELNYX_MESSAGING_PROFILE_ID = process.env.TELNYX_MESSAGING_PROFILE_ID;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const twilioClient = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? (0, twilio_1.default)(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;
async function sendSms(toRaw, message) {
    const to = (0, normalizePhone_1.normalizeUSPhone)(toRaw);
    if (!to) {
        return { ok: false, to: toRaw, error: "Invalid phone number format" };
    }
    // 1) Try Telnyx first if configured
    if (TELNYX_API_KEY && TELNYX_FROM_NUMBER && TELNYX_MESSAGING_PROFILE_ID) {
        try {
            await axios_1.default.post("https://api.telnyx.com/v2/messages", {
                from: TELNYX_FROM_NUMBER,
                to,
                text: message,
                messaging_profile_id: TELNYX_MESSAGING_PROFILE_ID,
            }, {
                headers: {
                    Authorization: `Bearer ${TELNYX_API_KEY}`,
                    "Content-Type": "application/json",
                },
                timeout: 10000,
            });
            return { ok: true, provider: "telnyx", to };
        }
        catch (err) {
            console.error("[SMS][TELNYX_ERROR]", err?.response?.data || err?.message || err);
        }
    }
    // 2) Fallback to Twilio
    if (twilioClient && TWILIO_PHONE_NUMBER) {
        try {
            await twilioClient.messages.create({
                from: TWILIO_PHONE_NUMBER,
                to,
                body: message,
            });
            return { ok: true, provider: "twilio", to };
        }
        catch (err) {
            console.error("[SMS][TWILIO_ERROR]", err?.message || err);
            return { ok: false, provider: "twilio", to, error: err?.message || "Unknown Twilio error" };
        }
    }
    return {
        ok: false,
        to,
        error: "No SMS provider configured (Telnyx/Twilio missing)",
    };
}
