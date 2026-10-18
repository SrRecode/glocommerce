import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { UserRole } from "../modules/auth/auth.types.js";
import { verifyAccessToken } from "../modules/auth/token.service.js";
import { User, type UserDocument } from "../modules/auth/user.model.js";
import { AppError } from "../utils/app-error.js";

function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

/**
 * Verifies the access token, reloads the account from MongoDB (so role changes
 * and deactivation take effect immediately) and exposes it on `res.locals.user`.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = readBearerToken(req);
    if (!token) throw AppError.unauthorized("Authentication required");

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (!user) throw AppError.unauthorized("Account no longer exists");

    res.locals.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function getAuthUser(res: Response): UserDocument {
  const user = res.locals.user as UserDocument | undefined;
  if (!user) throw AppError.unauthorized("Authentication required");
  return user;
}

/**
 * Attaches the account when a valid access token is present, but never rejects the
 * request. Used by checkout so a signed-in order is linked to the user while guests
 * can still complete the same flow.
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = readBearerToken(req);
    if (!token) return next();

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (!user) return next();

    res.locals.user = user;
    next();
  } catch {
    next();
  }
}

export function getOptionalAuthUser(res: Response): UserDocument | null {
  return (res.locals.user as UserDocument | undefined) ?? null;
}

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (_req, res, next) => {
    try {
      const user = getAuthUser(res);
      if (!roles.includes(user.role)) {
        throw AppError.forbidden("You do not have access to this resource");
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Optional email-verification gate. Not applied to any route yet, so guests can
 * browse, register and check out without verifying their address first.
 */
export function requireVerifiedEmail(): RequestHandler {
  return (_req, res, next) => {
    try {
      const user = getAuthUser(res);
      if (!user.isEmailVerified) {
        throw AppError.forbidden("Verify your email address to continue");
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
