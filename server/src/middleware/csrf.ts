import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// State-changing, cookie-authenticated endpoints must come from a trusted
// origin. Cross-site browsers always attach an Origin header, so a missing
// header means a non-browser or same-origin request and is allowed through.
export const assertTrustedOrigin: RequestHandler = (req, _res, next) => {
  if (env.isTest || SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.get("origin");

  if (!origin || env.clientOrigins.includes(origin)) {
    next();
    return;
  }

  next(AppError.forbidden(`Origin ${origin} is not allowed`));
};
