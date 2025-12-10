// src/routes/health.ts
import { Router, Request, Response } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "tc-text-server" });
});
