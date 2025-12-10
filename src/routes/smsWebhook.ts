// src/routes/smsWebhook.ts
import { Router } from "express";
import { prisma } from "../prisma";

export const smsWebhookRouter = Router();

/**
 * Handles inbound STOP / HELP / status webhooks from Telnyx/Twilio.
 * For now we only update our local user record; no reply SMS needed here.
 */
smsWebhookRouter.post("/", async (req, res) => {
  try {
    const body: any = req.body;

    // Flexible extraction of "from" and "text" across providers
    const fromRaw: string | undefined =
      body.from ||
      body.From ||
      body.data?.payload?.from?.phone_number ||
      body.data?.payload?.from;

    const textRaw: string | undefined =
      body.text ||
      body.Body ||
      body.data?.payload?.text ||
      body.data?.payload?.body;

    if (!fromRaw) {
      // Nothing useful in this webhook
      return res.status(200).json({ ok: true, ignored: true });
    }

    const from = String(fromRaw);
    const text = String(textRaw || "").trim().toUpperCase();

    let smsStatus: string | null = null;

    if (text === "STOP" || text === "STOPALL" || text === "UNSUBSCRIBE") {
      smsStatus = "stopped";
    } else if (text === "HELP") {
      smsStatus = "help";
    }

    if (smsStatus) {
      await prisma.user.updateMany({
        where: { phone: from },
        data: {
          smsStatus,
          smsOptIn: smsStatus !== "stopped",
          smsOptOutAt: smsStatus === "stopped" ? new Date() : null,
        },
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[SMS_WEBHOOK_ERROR]", err);
    return res.status(500).json({ ok: false });
  }
});
