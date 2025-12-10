// src/routes/broadcast.ts
import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import { sendSms } from "../services/smsSender";

export const broadcastRouter = Router();

// POST /sms/broadcast { message: "..." }
broadcastRouter.post("/broadcast", async (req: Request, res: Response) => {
  const message: string | undefined = req.body?.message;

  if (!message || !message.trim()) {
    return res.status(400).json({ ok: false, error: "message is required" });
  }

  try {
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

    const seen = new Set<string>();
    const targets = users
      .map((u) => u.phone || "")
      .filter((p) => Boolean(p) && !seen.has(p!))
      .map((p) => {
        seen.add(p!);
        return p!;
      });

    const results = [];
    for (const phone of targets) {
      const result = await sendSms(phone, message);
      results.push(result);
    }

    const successCount = results.filter((r) => r.ok).length;

    return res.json({
      ok: true,
      attempted: targets.length,
      sent: successCount,
      results,
    });
  } catch (err) {
    console.error("[SMS_BROADCAST_ERROR]", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});
