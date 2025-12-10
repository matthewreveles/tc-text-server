// src/routes/smsSubscribe.ts
import { Router } from "express";

// TS can't see the compiled JS yet, but it's there at runtime in dist/prisma.js.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { prisma } from "../prisma.js";

const smsSubscribeRouter = Router();

/**
 * POST /sms/subscribe
 *
 * Body:
 * {
 *   "name": "Matt",
 *   "phone": "+16023584042",
 *   "tags": ["trap_fam"],
 *   "source": "trap-app"
 * }
 *
 * This version:
 * - Uses the real Prisma client
 * - Creates or updates a User row keyed by phone
 * - Relies on Prisma defaults for createdAt / updatedAt
 */
smsSubscribeRouter.post("/subscribe", async (req, res, next) => {
  try {
    const { name, phone, tags, source } = req.body || {};

    if (!phone || typeof phone !== "string") {
      return res
        .status(400)
        .json({ ok: false, error: "Missing or invalid phone" });
    }

    const phoneE164 = String(phone).trim();
    const now = new Date();

    console.log("[sms/subscribe] incoming:", {
      name,
      phone: phoneE164,
      tags,
      source,
    });

    // Look up existing user by phone
    const existing = await prisma.user.findFirst({
      where: { phone: phoneE164 },
    });

    if (!existing) {
      // Create new user with a stable id derived from phone
      const numericPhone = phoneE164.replace(/\D/g, "");
      const fallbackId = Date.now().toString(36);
      const newUserId = `user-${numericPhone || fallbackId}`;

      await prisma.user.create({
        data: {
          id: newUserId,
          name: name ?? null,
          phone: phoneE164,
          smsOptIn: true,
          smsStatus: "active",
          smsOptInAt: now,
          smsOptSource: source ?? "trap-app",
          // createdAt and updatedAt are handled by @default(now()) and @updatedAt
        },
      });

      return res.status(200).json({
        ok: true,
        action: "created_and_opted_in",
        phone: phoneE164,
        tags: Array.isArray(tags) ? tags : [],
        source: source ?? "trap-app",
      });
    }

    // Update existing user by unique id
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: name ?? existing.name,
        phone: phoneE164,
        smsOptIn: true,
        smsStatus: "active",
        smsOptInAt: now,
        smsOptSource: source ?? existing.smsOptSource ?? "trap-app",
        // updatedAt is handled automatically by @updatedAt
      },
    });

    return res.status(200).json({
      ok: true,
      action: "updated_and_opted_in",
      phone: phoneE164,
      tags: Array.isArray(tags) ? tags : [],
      source: source ?? "trap-app",
    });
  } catch (err) {
    // Let the global error handler in index.ts format the error
    console.error("[sms/subscribe] error:", err);
    next(err);
  }
});

export { smsSubscribeRouter };
