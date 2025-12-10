"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastRouter = void 0;
// src/routes/broadcast.ts
const express_1 = require("express");
const prisma_1 = require("../prisma");
const smsSender_1 = require("../services/smsSender");
exports.broadcastRouter = (0, express_1.Router)();
// POST /sms/broadcast { message: "..." }
exports.broadcastRouter.post("/broadcast", async (req, res) => {
    const message = req.body?.message;
    if (!message || !message.trim()) {
        return res.status(400).json({ ok: false, error: "message is required" });
    }
    try {
        const users = await prisma_1.prisma.user.findMany({
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
        const seen = new Set();
        const targets = users
            .map((u) => u.phone || "")
            .filter((p) => Boolean(p) && !seen.has(p))
            .map((p) => {
            seen.add(p);
            return p;
        });
        const results = [];
        for (const phone of targets) {
            const result = await (0, smsSender_1.sendSms)(phone, message);
            results.push(result);
        }
        const successCount = results.filter((r) => r.ok).length;
        return res.json({
            ok: true,
            attempted: targets.length,
            sent: successCount,
            results,
        });
    }
    catch (err) {
        console.error("[SMS_BROADCAST_ERROR]", err);
        return res.status(500).json({ ok: false, error: "Internal server error" });
    }
});
