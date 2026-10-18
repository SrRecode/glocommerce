import { Router } from "express";

export const healthRouter: Router = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    status: "ok",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
