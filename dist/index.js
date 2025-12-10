// src/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.js";
import { smsWebhookRouter } from "./routes/smsWebhook.js";
import { broadcastRouter } from "./routes/broadcast.js";
const app = express();
const port = process.env.PORT || 4000;
// Parse JSON
app.use(express.json());
// CORS (tighten origins later if you want)
app.use(cors({
    origin: "*",
}));
// Routes
app.use("/health", healthRouter);
app.use("/sms/webhook", smsWebhookRouter);
app.use("/sms", broadcastRouter);
app.listen(port, () => {
    console.log(`TC Text Server listening on http://localhost:${port}`);
});
export default app;
