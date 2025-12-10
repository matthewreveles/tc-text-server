"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smsWebhookRouter = void 0;
// src/routes/smsWebhook.ts
const express_1 = require("express");
const prisma_1 = require("../prisma");
exports.smsWebhookRouter = (0, express_1.Router)();
/**
 * Handles inbound STOP / HELP / status webhooks from Telnyx/Twilio.
 * For now we only update our local user record; no reply SMS needed here.
 */
exports.smsWebhookRouter.post("/", async (req, res) => {
    try {
        const body = req.body;
        // Flexible extraction of "from" and "text" across providers
        const fromRaw = body.from ||
            body.From ||
            body.data?.payload?.from?.phone_number ||
            body.data?.payload?.from;
        const textRaw = body.text ||
            body.Body ||
            body.data?.payload?.text ||
            body.data?.payload?.body;
        if (!fromRaw) {
            // Nothing useful in this webhook
            return res.status(200).json({ ok: true, ignored: true });
        }
        const from = String(fromRaw);
        const text = String(textRaw || "").trim().toUpperCase();
        let smsStatus = null;
        if (text === "STOP" || text === "STOPALL" || text === "UNSUBSCRIBE") {
            smsStatus = "stopped";
        }
        else if (text === "HELP") {
            smsStatus = "help";
        }
        if (smsStatus) {
            await prisma_1.prisma.user.updateMany({
                where: { phone: from },
                data: {
                    smsStatus,
                    smsOptIn: smsStatus !== "stopped",
                    smsOptOutAt: smsStatus === "stopped" ? new Date() : null,
                },
            });
        }
        return res.status(200).json({ ok: true });
    }
    catch (err) {
        console.error("[SMS_WEBHOOK_ERROR]", err);
        return res.status(500).json({ ok: false });
    }
});
