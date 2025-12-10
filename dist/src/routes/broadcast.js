"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastRouter = void 0;
// src/routes/broadcast.ts
const express_1 = require("express");
const prisma_1 = require("../prisma");
const smsSender_1 = require("../services/smsSender");
exports.broadcastRouter = (0, express_1.Router)();
exports.broadcastRouter.post("/broadcast", async (req, res) => {
    const body = req.body;
    const message = (body.message || "").trim();
    if (!message) {
        return res.status(400).json({
            ok: false,
            error: "Message is required.",
        });
    }
    try {
        // All opted-in users with active SMS and a phone number
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
        const results = [];
        for (const user of users) {
            const phone = user.phone;
            if (!phone) {
                continue;
            }
            // serial on purpose here; volume is small for now
            // eslint-disable-next-line no-await-in-loop
            const result = await (0, smsSender_1.sendSmsToNumber)(phone, message);
            results.push(result);
        }
        const attempted = results.length;
        const sent = results.filter((r) => r.ok).length;
        return res.json({
            ok: true,
            attempted,
            sent,
            results,
        });
    }
    catch (err) {
        console.error("[SMS_BROADCAST_ERROR]", err);
        return res.status(500).json({
            ok: false,
            error: "Unexpected server error.",
        });
    }
});
