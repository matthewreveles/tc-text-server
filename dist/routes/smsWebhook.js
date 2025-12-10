// src/routes/smsWebhook.ts
import { Router } from "express";
import { prisma } from "../prisma.js";
const smsWebhookRouter = Router();
/**
 * Telnyx-style inbound webhook handler.
 *
 * Mounted at /sms in src/index.ts, so this path is:
 *   POST /sms/webhook
 */
smsWebhookRouter.post("/webhook", async (req, res) => {
    try {
        const payload = req.body;
        const data = payload?.data;
        const record = data?.record;
        const toNumber = record?.to?.[0]?.phone_number;
        const fromNumber = record?.from?.phone_number;
        const text = record?.text;
        if (!toNumber && !fromNumber) {
            return res.status(200).json({ ok: true, ignored: true });
        }
        const phone = fromNumber || toNumber;
        if (!phone) {
            return res.status(200).json({ ok: true, ignored: true });
        }
        const lowerText = (text || "").trim().toLowerCase();
        // STOP / UNSUBSCRIBE
        if (lowerText === "stop" || lowerText === "unsubscribe") {
            await prisma.user.updateMany({
                where: { phone },
                data: {
                    smsOptIn: false,
                    smsStatus: "stopped",
                    smsOptOutAt: new Date(),
                },
            });
            return res.status(200).json({ ok: true, action: "stopped", phone });
        }
        // START
        if (lowerText === "start") {
            await prisma.user.updateMany({
                where: { phone },
                data: {
                    smsOptIn: true,
                    smsStatus: "active",
                    smsOptInAt: new Date(),
                },
            });
            return res.status(200).json({ ok: true, action: "started", phone });
        }
        // Everything else
        return res.status(200).json({ ok: true, action: "ignored", phone });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[SMS WEBHOOK ERROR]", err);
        return res.status(500).json({ ok: false, error: msg });
    }
});
export { smsWebhookRouter };
