// src/routes/smsWebhook.ts
import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

/**
 * Telnyx inbound webhook handler
 * We only care about STOP / START-style events to update user status.
 */
router.post("/", async (req, res) => {
  try {
    const payload = req.body as any;

    const data = payload?.data;
    const record = data?.record;

    const toNumber: string | undefined = record?.to[0]?.phone_number;
    const fromNumber: string | undefined = record?.from?.phone_number;
    const text: string | undefined = record?.text;

    if (!toNumber && !fromNumber) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const phone = fromNumber || toNumber;

    if (!phone) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const lowerText = (text || "").trim().toLowerCase();

    // Basic STOP / START handling
    if (lowerText === "stop" || lowerText === "unsubscribe") {
      await prisma.user.updateMany({
        where: { phone },
        data: {
          smsOptIn: false,
          smsStatus: "stopped",
          smsOptOutAt: new Date(),
        },
      });

      return res.status(200).json({ ok: true, action: "stopped" });
    }

    if (lowerText === "start") {
      await prisma.user.updateMany({
        where: { phone },
        data: {
          smsOptIn: true,
          smsStatus: "active",
          smsOptInAt: new Date(),
        },
      });

      return res.status(200).json({ ok: true, action: "started" });
    }

    // Everything else just gets acknowledged
    return res.status(200).json({ ok: true, action: "ignored" });
  } catch (err) {
    console.error("[SMS WEBHOOK ERROR]", err);
    return res.status(500).json({ ok: false });
  }
});

export { router as smsWebhookRouter };
