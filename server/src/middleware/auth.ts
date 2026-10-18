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
 * Reserved for checkout and order-history routes in Phase 4. Not yet applied to
 * any route, so guests can still browse and register without verifying.
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
