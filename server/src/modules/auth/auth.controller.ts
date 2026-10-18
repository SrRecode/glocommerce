import type { Request, RequestHandler } from "express";
import { getAuthUser } from "../../middleware/auth.js";
import type { ForgotPasswordInput, LoginInput, RegisterInput, ResetPasswordInput, VerifyEmailInput } from "./auth.schemas.js";
import {
  loginUser,
  logoutUser,
  registerUser,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  rotateRefreshToken,
  verifyEmail,
} from "./auth.service.js";
import type { SessionContext } from "./auth.types.js";
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from "../../utils/cookies.js";
import { toPublicUser } from "./user.mapper.js";

function sessionContext(req: Request): SessionContext {
  return {
    userAgent: req.get("user-agent") ?? null,
    ip: req.ip ?? null,
  };
}

export const register: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as RegisterInput;
    const session = await registerUser(input, sessionContext(req));
    setRefreshCookie(res, session.refreshToken);
    res.status(201).json({ user: session.user, accessToken: session.accessToken });
  } catch (error) {
    next(error);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as LoginInput;
    const session = await loginUser(input, sessionContext(req));
    setRefreshCookie(res, session.refreshToken);
    res.status(200).json({ user: session.user, accessToken: session.accessToken });
  } catch (error) {
    next(error);
  }
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const session = await rotateRefreshToken(readRefreshCookie(req.cookies), sessionContext(req));
    setRefreshCookie(res, session.refreshToken);
    res.status(200).json({ user: session.user, accessToken: session.accessToken });
  } catch (error) {
    // A stale or reused cookie must not be retried forever by the client.
    clearRefreshCookie(res);
    next(error);
  }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    await logoutUser(readRefreshCookie(req.cookies));
    clearRefreshCookie(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const me: RequestHandler = (_req, res) => {
  res.status(200).json({ user: toPublicUser(getAuthUser(res)) });
};

export const verifyEmailAddress: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as VerifyEmailInput;
    const user = await verifyEmail(input.token);
    res.status(200).json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
};

export const resendVerificationEmail: RequestHandler = async (_req, res, next) => {
  try {
    await resendVerification(getAuthUser(res));
    res.status(202).json({ message: "Verification email sent" });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as ForgotPasswordInput;
    await requestPasswordReset(input.email);
    res.status(202).json({
      message: "If an account exists for that email, a reset link has been sent",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPasswordWithToken: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as ResetPasswordInput;
    await resetPassword(input.token, input.password);
    clearRefreshCookie(res);
    res.status(200).json({ message: "Password updated. Sign in with your new password." });
  } catch (error) {
    next(error);
  }
};
