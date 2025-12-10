// src/index.ts
import express from "express";
import cors from "cors";

import { healthRouter } from "./routes/health.js";
import { smsWebhookRouter } from "./routes/smsWebhook.js";
import { broadcastRouter } from "./routes/broadcast.js";

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Simple root route for quick checks
app.get("/", (_req, res) => {
  res.status(200).send("TC Text Server is running");
});

// Health + SMS routes
app.use("/health", healthRouter);
app.use("/sms", smsWebhookRouter);
app.use("/sms", broadcastRouter);

// Basic error handler so Vercel logs are clearer
app.use(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[UNHANDLED_ERROR]", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  },
);

app.listen(port, () => {
  console.log(`TC Text Server listening on http://localhost:${port}`);
});
