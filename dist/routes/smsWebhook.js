"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smsWebhookRouter = void 0;
// src/routes/smsWebhook.ts
const express_1 = require("express");
const prisma_1 = require("../prisma");
const normalizePhone_1 = require("../services/normalizePhone");
const smsSender_1 = require("../services/smsSender");
exports.smsWebhookRouter = (0, express_1.Router)();
// Twilio-style inbound webhook: POST /webhooks/sms
exports.smsWebhookRouter.post("/sms", async (req, res) => {
    try {
        const fromRaw = req.body.From || req.body.from;
        const bodyRaw = req.body.Body || req.body.text;
        const from = (0, normalizePhone_1.normalizeUSPhone)(fromRaw);
        const body = (bodyRaw || "").trim().toUpperCase();
        if (!from) {
            console.warn("[SMS_WEBHOOK] Missing or invalid From:", fromRaw);
            return res.status(200).send("<Response></Response>");
        }
        if (!body) {
            return res.status(200).send("<Response></Response>");
        }
        // STOP keywords
        const stopKeywords = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"];
        const isStop = stopKeywords.includes(body);
        const isHelp = body === "HELP";
        if (isStop) {
            const now = new Date();
            await prisma_1.prisma.user.updateMany({
                where: { phone: from },
                data: {
                    smsOptIn: false,
                    smsStatus: "stopped",
                    smsOptOutAt: now,
                },
            });
            await (0, smsSender_1.sendSms)(from, "You’ve been unsubscribed from Trap Culture texts. No more messages will be sent. HELP for help.");
            return res
                .status(200)
                .send('<Response><Message>Unsubscribed.</Message></Response>');
        }
        if (isHelp) {
            await (0, smsSender_1.sendSms)(from, "Trap Culture SMS: merch drops, events, exclusives. STOP to opt out. Std rates apply.");
            await prisma_1.prisma.user.updateMany({
                where: { phone: from },
                data: {
                    smsStatus: "help",
                },
            });
            return res
                .status(200)
                .send('<Response><Message>Help info sent.</Message></Response>');
        }
        // For non-keyword messages, we just return an empty TwiML response
        return res.status(200).send("<Response></Response>");
    }
    catch (err) {
        console.error("[SMS_WEBHOOK_ERROR]", err);
        return res.status(200).send("<Response></Response>");
    }
});
