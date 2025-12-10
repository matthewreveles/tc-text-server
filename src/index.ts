// src/index.ts
import "dotenv/config"; // <-- ensure .env is loaded BEFORE anything else
import express from "express";
import cors from "cors";

import { healthRouter } from "./routes/health.js";
import { smsWebhookRouter } from "./routes/smsWebhook.js";
import { broadcastRouter } from "./routes/broadcast.js";
import { smsSubscribeRouter } from "./routes/smsSubscribe.js";

// Immediately show what DATABASE_URL this runtime sees
console.log("[tc-text-server] Runtime DATABASE_URL =", process.env.DATABASE_URL);

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Root → baseline check
app.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "tc-text-server",
    hint: "Try GET /health, POST /sms/webhook, /sms/subscribe, or /sms/broadcast",
  });
});

// Route mounting
app.use("/health", healthRouter);
app.use("/sms", smsWebhookRouter);   // POST /sms/webhook
app.use("/sms", broadcastRouter);    // POST /sms/broadcast
app.use("/sms", smsSubscribeRouter); // POST /sms/subscribe

// Global error handler
app.use(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
        ? err
        : "Unknown error";

    console.error("[UNHANDLED_ERROR]", err);

    res.status(500).json({
      ok: false,
      error: "Internal server error",
      details: message,
      stack: process.env.NODE_ENV !== "production" ? String(err) : undefined,
    });
  }
);

// Start server
app.listen(port, () => {
  const hasDb = !!process.env.DATABASE_URL;
  console.log(`[tc-text-server] DATABASE_URL present: ${hasDb}`);
  console.log(`TC Text Server listening on http://localhost:${port}`);
});
