import { createHash, randomBytes } from "node:crypto";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";
import { isUserRole, type AccessTokenPayload } from "./auth.types.js";

const OPAQUE_TOKEN_BYTES = 32;
const REFRESH_TOKEN_BYTES = 48;

/**
 * Access tokens are stateless JWTs. Refresh tokens are opaque random strings stored
 * as SHA-256 hashes, so a database leak never exposes a usable session.
 */
export function issueAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    algorithm: "HS256",
    expiresIn: env.JWT_ACCESS_TTL as NonNullable<SignOptions["expiresIn"]>,
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  let decoded: string | JwtPayload;

  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] });
  } catch {
    throw AppError.unauthorized("Invalid or expired access token");
  }

  if (typeof decoded === "string") {
    throw AppError.unauthorized("Invalid or expired access token");
  }

  const sub = decoded.sub;
  const role = decoded.role;

  if (typeof sub !== "string" || !isUserRole(role)) {
    throw AppError.unauthorized("Invalid or expired access token");
  }

  return { sub, role };
}

export function createRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
}

/** Single-use tokens for email verification and password reset links. */
export function createOpaqueToken(): string {
  return randomBytes(OPAQUE_TOKEN_BYTES).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
