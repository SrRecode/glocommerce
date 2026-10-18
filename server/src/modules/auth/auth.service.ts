import { compare, hash } from "bcryptjs";
import type { Types } from "mongoose";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";
import type { AuthSession, SessionContext } from "./auth.types.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "./mail.service.js";
import { RefreshSession } from "./refresh-session.model.js";
import {
  createOpaqueToken,
  createRefreshToken,
  hashToken,
  issueAccessToken,
} from "./token.service.js";
import { toPublicUser } from "./user.mapper.js";
import { User, type UserDocument } from "./user.model.js";

const DUMMY_PASSWORD = "glocommerce-timing-equalization-placeholder";
const INVALID_CREDENTIALS_MESSAGE = "Email or password is incorrect";
const INVALID_TOKEN_MESSAGE = "This link is invalid or has expired";

let dummyPasswordHash: string | null = null;

/**
 * Comparing against a real hash when the email is unknown keeps login timing
 * roughly constant, so an attacker cannot enumerate accounts by response time.
 */
async function getDummyPasswordHash(): Promise<string> {
  dummyPasswordHash ??= await hash(DUMMY_PASSWORD, env.bcryptCost);
  return dummyPasswordHash;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

async function createSession(user: UserDocument, context: SessionContext): Promise<AuthSession> {
  const refreshToken = createRefreshToken();

  await RefreshSession.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + env.refreshTokenTtlMs),
    revokedAt: null,
    userAgent: context.userAgent,
    ip: context.ip,
  });

  return {
    user: toPublicUser(user),
    accessToken: issueAccessToken({ sub: user._id.toString(), role: user.role }),
    refreshToken,
  };
}

async function revokeAllSessions(userId: Types.ObjectId): Promise<void> {
  await RefreshSession.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

export async function registerUser(
  input: { name: string; email: string; password: string },
  context: SessionContext,
): Promise<AuthSession> {
  const passwordHash = await hash(input.password, env.bcryptCost);
  const verificationToken = createOpaqueToken();

  let user: UserDocument;

  try {
    user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: "customer",
      isEmailVerified: false,
      emailVerificationTokenHash: hashToken(verificationToken),
      emailVerificationExpiresAt: new Date(Date.now() + env.emailTokenTtlMs),
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw AppError.conflict("An account with that email already exists");
    }
    throw error;
  }

  sendVerificationEmail(user.email, verificationToken);

  return createSession(user, context);
}

export async function loginUser(
  input: { email: string; password: string },
  context: SessionContext,
): Promise<AuthSession> {
  const user = await User.findOne({ email: input.email }).select("+passwordHash");

  if (!user) {
    await compare(input.password, await getDummyPasswordHash());
    throw AppError.unauthorized(INVALID_CREDENTIALS_MESSAGE);
  }

  const passwordMatches = await compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw AppError.unauthorized(INVALID_CREDENTIALS_MESSAGE);
  }

  return createSession(user, context);
}

export async function rotateRefreshToken(
  token: string | null,
  context: SessionContext,
): Promise<AuthSession> {
  if (!token) throw AppError.unauthorized("Refresh token is missing");

  const session = await RefreshSession.findOne({ tokenHash: hashToken(token) });
  if (!session) throw AppError.unauthorized("Refresh token is invalid");

  // Reuse of a rotated token means the token leaked: drop every session for the user.
  if (session.revokedAt) {
    await revokeAllSessions(session.user);
    throw AppError.unauthorized("Refresh token has already been used");
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    throw AppError.unauthorized("Refresh token has expired");
  }

  const user = await User.findById(session.user);
  if (!user) {
    await revokeAllSessions(session.user);
    throw AppError.unauthorized("Account no longer exists");
  }

  session.revokedAt = new Date();
  await session.save();

  return createSession(user, context);
}

export async function logoutUser(token: string | null): Promise<void> {
  if (!token) return;

  await RefreshSession.updateOne(
    { tokenHash: hashToken(token), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

export async function verifyEmail(token: string): Promise<UserDocument> {
  const user = await User.findOne({
    emailVerificationTokenHash: hashToken(token),
    emailVerificationExpiresAt: { $gt: new Date() },
  });

  if (!user) throw AppError.badRequest(INVALID_TOKEN_MESSAGE);

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpiresAt = null;
  await user.save();

  return user;
}

export async function resendVerification(user: UserDocument): Promise<void> {
  if (user.isEmailVerified) {
    throw AppError.badRequest("This email address is already verified");
  }

  const verificationToken = createOpaqueToken();

  user.emailVerificationTokenHash = hashToken(verificationToken);
  user.emailVerificationExpiresAt = new Date(Date.now() + env.emailTokenTtlMs);
  await user.save();

  sendVerificationEmail(user.email, verificationToken);
}

/** Always resolves successfully so the endpoint never reveals registered emails. */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email });
  if (!user) return;

  const resetToken = createOpaqueToken();

  user.passwordResetTokenHash = hashToken(resetToken);
  user.passwordResetExpiresAt = new Date(Date.now() + env.passwordResetTtlMs);
  await user.save();

  sendPasswordResetEmail(user.email, resetToken);
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(token),
    passwordResetExpiresAt: { $gt: new Date() },
  });

  if (!user) throw AppError.badRequest(INVALID_TOKEN_MESSAGE);

  user.passwordHash = await hash(password, env.bcryptCost);
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  await user.save();

  // A reset invalidates every existing session, including the attacker's.
  await revokeAllSessions(user._id);
}
