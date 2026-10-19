import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { env } from "../../config/env.js";
import { requireAuth } from "../../middleware/auth.js";
import { assertTrustedOrigin } from "../../middleware/csrf.js";
import { clientRateLimitKey } from "../../middleware/rate-limit.js";
import { validateBody } from "../../middleware/validate.js";
import {
  forgotPassword,
  login,
  logout,
  me,
  refresh,
  register,
  resendVerificationEmail,
  resetPasswordWithToken,
  verifyEmailAddress,
} from "./auth.controller.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.schemas.js";

// Credential endpoints get a tighter budget than the general API limiter.
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: clientRateLimitKey,
  skip: () => env.isTest,
});

export const authRouter = Router();

authRouter.use(authRateLimit);

authRouter.post("/register", validateBody(registerSchema), register);
authRouter.post("/login", validateBody(loginSchema), login);
authRouter.post("/refresh", assertTrustedOrigin, refresh);
authRouter.post("/logout", assertTrustedOrigin, logout);
authRouter.get("/me", requireAuth, me);
authRouter.post("/verify-email", validateBody(verifyEmailSchema), verifyEmailAddress);
authRouter.post("/resend-verification", requireAuth, resendVerificationEmail);
authRouter.post("/forgot-password", validateBody(forgotPasswordSchema), forgotPassword);
authRouter.post("/reset-password", validateBody(resetPasswordSchema), resetPasswordWithToken);
