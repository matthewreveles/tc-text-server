// src/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";
import { smsWebhookRouter } from "./routes/smsWebhook";
import { broadcastRouter } from "./routes/broadcast";

const app = express();
const port = process.env.PORT || 4000;

// Parse JSON
app.use(express.json());
// If you later need Twilio-style form-encoded webhooks, uncomment:
// app.use(express.urlencoded({ extended: false }));

// CORS (adjust origin as needed)
app.use(
  cors({
    origin: "*",
  })
);

// Simple root route so / shows something
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "tc-text-server",
    hint: "Try GET /health or POST /sms/broadcast",
  });
});

// Routes
app.use("/health", healthRouter);
app.use("/webhooks", smsWebhookRouter);
app.use("/sms", broadcastRouter);

app.listen(port, () => {
  console.log(`TC Text Server listening on http://localhost:${port}`);
});
