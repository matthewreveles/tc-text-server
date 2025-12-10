// src/routes/smsWebhook.ts
import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import { normalizeUSPhone } from "../services/normalizePhone";
import { sendSms } from "../services/smsSender";

export const smsWebhookRouter = Router();

// Twilio-style inbound webhook: POST /webhooks/sms
smsWebhookRouter.post("/sms", async (req: Request, res: Response) => {
  try {
    const fromRaw: string | undefined = req.body.From || req.body.from;
    const bodyRaw: string | undefined = req.body.Body || req.body.text;

    const from = normalizeUSPhone(fromRaw);
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

      await prisma.user.updateMany({
        where: { phone: from },
        data: {
          smsOptIn: false,
          smsStatus: "stopped",
          smsOptOutAt: now,
        },
      });

      await sendSms(
        from,
        "You’ve been unsubscribed from Trap Culture texts. No more messages will be sent. HELP for help."
      );

      return res
        .status(200)
        .send('<Response><Message>Unsubscribed.</Message></Response>');
    }

    if (isHelp) {
      await sendSms(
        from,
        "Trap Culture SMS: merch drops, events, exclusives. STOP to opt out. Std rates apply."
      );

      await prisma.user.updateMany({
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
  } catch (err) {
    console.error("[SMS_WEBHOOK_ERROR]", err);
    return res.status(200).send("<Response></Response>");
  }
});
