// src/routes/broadcast.ts
import { Router } from "express";
import { prisma } from "../prisma";
import { sendSmsToNumber, type SmsSendResult } from "../services/smsSender";

export const broadcastRouter = Router();

broadcastRouter.post("/broadcast", async (req, res) => {
  const body = req.body as { message?: string };
  const message = (body.message || "").trim();

  if (!message) {
    return res.status(400).json({
      ok: false,
      error: "Message is required.",
    });
  }

  try {
    // All opted-in users with active SMS and a phone number
    const users = await prisma.user.findMany({
      where: {
        smsOptIn: true,
        smsStatus: "active",
        phone: { not: null },
      },
      select: {
        id: true,
        phone: true,
      },
    });

    const results: SmsSendResult[] = [];

    for (const user of users) {
      const phone = user.phone;
      if (!phone) {
        continue;
      }

      // serial on purpose here; volume is small for now
      // eslint-disable-next-line no-await-in-loop
      const result = await sendSmsToNumber(phone, message);
      results.push(result);
    }

    const attempted = results.length;
    const sent = results.filter((r: SmsSendResult) => r.ok).length;

    return res.json({
      ok: true,
      attempted,
      sent,
      results,
    });
  } catch (err) {
    console.error("[SMS_BROADCAST_ERROR]", err);

    return res.status(500).json({
      ok: false,
      error: "Unexpected server error.",
    });
  }
});
