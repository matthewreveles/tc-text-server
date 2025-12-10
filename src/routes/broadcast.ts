// src/routes/broadcast.ts
import { Router } from "express";
import { prisma } from "../prisma.js";
import { sendSmsToNumber, type SmsSendResult } from "../services/smsSender.js";

const router = Router();

/**
 * POST /sms/broadcast
 * Body: { message: string }
 *
 * Sends a one-off blast to all users who:
 *  - have a phone number
 *  - smsOptIn === true
 *  - smsStatus === "active" (or null / undefined)
 */
router.post("/broadcast", async (req, res) => {
  const { message } = req.body as { message?: string };

  if (!message || !message.trim()) {
    return res.status(400).json({
      ok: false,
      error: "Message is required.",
    });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        smsOptIn: true,
        phone: { not: null },
        OR: [
          { smsStatus: null },
          { smsStatus: "active" },
        ],
      },
      select: {
        id: true,
        phone: true,
      },
    });

    if (!users.length) {
      return res.status(200).json({
        ok: true,
        attempted: 0,
        sent: 0,
        results: [],
        note: "No opted-in users with valid phone numbers.",
      });
    }

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
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.ok).length;

    return res.status(200).json({
      ok: true,
      attempted: results.length,
      sent: successCount,
      results,
    });
  } catch (err) {
    console.error("[SMS BROADCAST ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to send broadcast SMS.",
    });
  }
});

export { router as broadcastRouter };
