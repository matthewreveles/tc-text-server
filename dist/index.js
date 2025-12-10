"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const health_1 = require("./routes/health");
const smsWebhook_1 = require("./routes/smsWebhook");
const broadcast_1 = require("./routes/broadcast");
const app = (0, express_1.default)();
const port = process.env.PORT || 4000;
// Parse JSON
app.use(express_1.default.json());
// If you later need Twilio-style form-encoded webhooks, uncomment:
// app.use(express.urlencoded({ extended: false }));
// CORS (adjust origin as needed)
app.use((0, cors_1.default)({
    origin: "*",
}));
// Simple root route so / shows something
app.get("/", (_req, res) => {
    res.json({
        ok: true,
        service: "tc-text-server",
        hint: "Try GET /health or POST /sms/broadcast",
    });
});
// Routes
app.use("/health", health_1.healthRouter);
app.use("/webhooks", smsWebhook_1.smsWebhookRouter);
app.use("/sms", broadcast_1.broadcastRouter);
app.listen(port, () => {
    console.log(`TC Text Server listening on http://localhost:${port}`);
});
