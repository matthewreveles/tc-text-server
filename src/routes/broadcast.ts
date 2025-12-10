// src/routes/broadcast.ts
import { Router, type Request, type Response } from "express";
import { prisma } from "../prisma.js";
import {
  sendSmsToNumber,
  type SmsSendResult,
} from "../services/smsSender.js";

export const broadcastRouter = Router();

// This becomes POST /sms/broadcast because router is mounted at /sms
broadcastRouter.post("/broadcast", async (req: Request, res: Response) => {
  const { message } = req.body as { message?: string };

  if (!message || !message.trim()) {
    return res
      .status(400)
      .json({ ok: false, error: "Message is required." });
  }

  try {
    // Pull all opted-in users with phone numbers
    const users = await prisma.user.findMany({
      where: {
        smsOptIn: true,
        phone: { not: null },
      },
      select: {
        id: true,
        phone: true,
      },
    });

    const results: SmsSendResult[] = [];

    for (const user of users) {
      if (!user.phone) continue;

      try {
        const result = await sendSmsToNumber(user.phone, message);
        results.push(result);
      } catch (err) {
        results.push({
          ok: false,
          provider: "telnyx",
          to: user.phone,
          error:
            err instanceof Error
              ? err.message
              : "Unknown SMS error during broadcast",
        });
      }
    }

    const successCount = results.filter((r) => r.ok).length;

    return res.json({
      ok: true,
      attempted: users.length,
      sent: successCount,
      failures: results.length - successCount,
    });
  } catch (err) {
    console.error("[SMS BROADCAST ERROR]", err);
    return res
      .status(500)
      .json({ ok: false, error: "Broadcast failed; see logs." });
  }
});
