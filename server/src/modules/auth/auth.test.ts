import express from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { errorHandler } from "../../middleware/error-handler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { clearTestDb, connectTestDb, disconnectTestDb } from "../../test/db.js";
import { clearOutbox, readOutbox } from "../../utils/mailer.js";
import type { OutboundMail } from "../../utils/mailer.js";
import { REFRESH_COOKIE_NAME } from "../../utils/cookies.js";
import type { PublicUser } from "./auth.types.js";
import { RefreshSession } from "./refresh-session.model.js";
import { User } from "./user.model.js";

const PASSWORD = "Sup3rSecret!";
const EMAIL = "ada@example.com";

const app = buildApp();

function setCookies(response: request.Response): string[] {
  const value: unknown = response.headers["set-cookie"];
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  return typeof value === "string" ? [value] : [];
}

function refreshCookie(response: request.Response): string {
  const cookie = setCookies(response).find((entry) =>
    entry.startsWith(`${REFRESH_COOKIE_NAME}=`),
  );
  if (!cookie) {
    throw new Error("Expected a refresh cookie on the response");
  }
  return cookie.split(";")[0] ?? "";
}

function latestMail(): OutboundMail {
  const mails = readOutbox();
  const mail = mails[mails.length - 1];
  if (!mail) {
    throw new Error("Expected at least one outbound email");
  }
  return mail;
}

function extractToken(text: string, marker: string): string {
  const start = text.indexOf(marker);
  if (start === -1) {
    throw new Error(`Marker "${marker}" not found in email body`);
  }
  const value = text.slice(start + marker.length).split(/\s/)[0];
  if (!value) {
    throw new Error("Token missing from email body");
  }
  return decodeURIComponent(value);
}

function asPublicUser(response: request.Response): PublicUser {
  return response.body.user as PublicUser;
}

async function registerUser(
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<request.Response> {
  return request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Ada Lovelace", email: EMAIL, password: PASSWORD, ...overrides });
}

async function loginUser(email = EMAIL, password = PASSWORD): Promise<request.Response> {
  return request(app).post("/api/v1/auth/login").send({ email, password });
}

beforeAll(async () => {
  await connectTestDb();
  await Promise.all([User.init(), RefreshSession.init()]);
});

beforeEach(async () => {
  await clearTestDb();
  clearOutbox();
});

afterAll(async () => {
  await disconnectTestDb();
});

describe("POST /api/v1/auth/register", () => {
  it("creates an account, returns the public user and sets a refresh cookie", async () => {
    const response = await registerUser();

    expect(response.status).toBe(201);
    expect(asPublicUser(response)).toMatchObject({
      name: "Ada Lovelace",
      email: EMAIL,
      role: "customer",
      isEmailVerified: false,
    });
    expect(typeof asPublicUser(response).id).toBe("string");
    expect(typeof response.body.accessToken).toBe("string");
    expect(response.body.user).not.toHaveProperty("passwordHash");

    const cookie = refreshCookie(response);
    expect(cookie.startsWith(`${REFRESH_COOKIE_NAME}=`)).toBe(true);
    expect(setCookies(response).join(";").toLowerCase()).toContain("httponly");
  });

  it("only ever stores hashed secrets", async () => {
    await registerUser();

    const stored = await User.findOne({ email: EMAIL }).select(
      "+passwordHash +emailVerificationTokenHash",
    );

    expect(stored).not.toBeNull();
    expect(stored?.passwordHash).not.toBe(PASSWORD);
    expect(stored?.passwordHash?.startsWith("$2")).toBe(true);
    expect(stored?.emailVerificationTokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("emails a verification token that verifies the account", async () => {
    await registerUser();

    const mail = latestMail();
    expect(mail.to).toBe(EMAIL);
    expect(mail.subject).toMatch(/confirm/i);

    const token = extractToken(mail.text, "token=");
    const response = await request(app).post("/api/v1/auth/verify-email").send({ token });

    expect(response.status).toBe(200);
    expect(response.body.user.isEmailVerified).toBe(true);
  });

  it("rejects a duplicate email regardless of casing", async () => {
    await registerUser();

    const response = await registerUser({ email: "ADA@Example.com" });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("CONFLICT");
  });

  it("rejects a weak password with a field-level error", async () => {
    const response = await registerUser({ password: "short" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(response.body.fieldErrors.password).toBeInstanceOf(Array);
  });

  it("rejects an invalid email address", async () => {
    const response = await registerUser({ email: "not-an-email" });

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors.email?.[0]).toEqual(expect.any(String));
  });
});

describe("POST /api/v1/auth/login", () => {
  beforeEach(async () => {
    await registerUser();
    clearOutbox();
  });

  it("signs in with valid credentials", async () => {
    const response = await loginUser();

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(EMAIL);
    expect(typeof response.body.accessToken).toBe("string");
    expect(refreshCookie(response).startsWith(`${REFRESH_COOKIE_NAME}=`)).toBe(true);
  });

  it("is case-insensitive about the email", async () => {
    const response = await loginUser("ADA@Example.com");

    expect(response.status).toBe(200);
  });

  it("rejects a wrong password", async () => {
    const response = await loginUser(EMAIL, "WrongPassword1");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("UNAUTHORIZED");
  });

  it("returns the same message for an unknown email so accounts cannot be enumerated", async () => {
    const wrongPassword = await loginUser(EMAIL, "WrongPassword1");
    const unknownEmail = await loginUser("nobody@example.com", PASSWORD);

    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
  });
});

describe("GET /api/v1/auth/me", () => {
  it("requires a token", async () => {
    const response = await request(app).get("/api/v1/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("UNAUTHORIZED");
  });

  it("rejects a malformed token", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer not-a-real-token");

    expect(response.status).toBe(401);
  });

  it("returns the current user for a valid token", async () => {
    const registered = await registerUser();
    const token = registered.body.accessToken as string;

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(EMAIL);
  });
});

describe("POST /api/v1/auth/refresh", () => {
  it("requires a refresh cookie", async () => {
    const response = await request(app).post("/api/v1/auth/refresh");

    expect(response.status).toBe(401);
  });

  it("rotates the refresh token and treats reuse as a leak", async () => {
    const registered = await registerUser();
    const first = refreshCookie(registered);

    const rotated = await request(app).post("/api/v1/auth/refresh").set("Cookie", first);
    expect(rotated.status).toBe(200);
    const second = refreshCookie(rotated);
    expect(second).not.toBe(first);

    const reused = await request(app).post("/api/v1/auth/refresh").set("Cookie", first);
    expect(reused.status).toBe(401);

    // Reuse revokes the whole session chain, including the rotated token.
    const afterLeak = await request(app).post("/api/v1/auth/refresh").set("Cookie", second);
    expect(afterLeak.status).toBe(401);
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("revokes the session and answers 204", async () => {
    const registered = await registerUser();
    const cookie = refreshCookie(registered);

    const response = await request(app).post("/api/v1/auth/logout").set("Cookie", cookie);
    expect(response.status).toBe(204);

    const afterLogout = await request(app).post("/api/v1/auth/refresh").set("Cookie", cookie);
    expect(afterLogout.status).toBe(401);
  });

  it("is idempotent without a cookie", async () => {
    const response = await request(app).post("/api/v1/auth/logout");

    expect(response.status).toBe(204);
  });
});

describe("POST /api/v1/auth/verify-email", () => {
  it("rejects an unknown or reused token", async () => {
    await registerUser();
    const token = extractToken(latestMail().text, "token=");

    const first = await request(app).post("/api/v1/auth/verify-email").send({ token });
    expect(first.status).toBe(200);

    const second = await request(app).post("/api/v1/auth/verify-email").send({ token });
    expect(second.status).toBe(400);
    expect(second.body.code).toBe("BAD_REQUEST");
  });

  it("rejects a garbage token", async () => {
    const response = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ token: "x".repeat(40) });

    expect(response.status).toBe(400);
  });
});

describe("POST /api/v1/auth/resend-verification", () => {
  it("sends a fresh verification email to an unverified user", async () => {
    const registered = await registerUser();
    const token = registered.body.accessToken as string;
    clearOutbox();

    const response = await request(app)
      .post("/api/v1/auth/resend-verification")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(202);
    expect(readOutbox()).toHaveLength(1);
    expect(latestMail().to).toBe(EMAIL);
  });

  it("refuses once the account is already verified", async () => {
    const registered = await registerUser();
    const token = registered.body.accessToken as string;
    const verificationToken = extractToken(latestMail().text, "token=");
    await request(app).post("/api/v1/auth/verify-email").send({ token: verificationToken });

    const response = await request(app)
      .post("/api/v1/auth/resend-verification")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("BAD_REQUEST");
  });
});

describe("password reset", () => {
  it("answers 202 for forgot-password whether or not the email exists", async () => {
    await registerUser();

    const known = await request(app).post("/api/v1/auth/forgot-password").send({ email: EMAIL });
    const unknown = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "nobody@example.com" });

    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(unknown.body.message).toBe(known.body.message);
  });

  it("emails a reset link only for a known account", async () => {
    await registerUser();
    clearOutbox();

    await request(app).post("/api/v1/auth/forgot-password").send({ email: "nobody@example.com" });
    expect(readOutbox()).toHaveLength(0);

    await request(app).post("/api/v1/auth/forgot-password").send({ email: EMAIL });
    expect(readOutbox()).toHaveLength(1);
    expect(latestMail().subject).toMatch(/reset/i);
  });

  it("resets the password and invalidates the old one", async () => {
    await registerUser();
    await request(app).post("/api/v1/auth/forgot-password").send({ email: EMAIL });
    const token = extractToken(latestMail().text, "token=");

    const response = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token, password: "BrandNewPass1" });
    expect(response.status).toBe(200);

    const oldLogin = await loginUser(EMAIL, PASSWORD);
    expect(oldLogin.status).toBe(401);

    const newLogin = await loginUser(EMAIL, "BrandNewPass1");
    expect(newLogin.status).toBe(200);
  });

  it("revokes existing sessions when the password is reset", async () => {
    const registered = await registerUser();
    const cookie = refreshCookie(registered);
    await request(app).post("/api/v1/auth/forgot-password").send({ email: EMAIL });
    const token = extractToken(latestMail().text, "token=");

    await request(app).post("/api/v1/auth/reset-password").send({ token, password: "BrandNewPass1" });

    const refresh = await request(app).post("/api/v1/auth/refresh").set("Cookie", cookie);
    expect(refresh.status).toBe(401);
  });

  it("rejects a reused reset token", async () => {
    await registerUser();
    await request(app).post("/api/v1/auth/forgot-password").send({ email: EMAIL });
    const token = extractToken(latestMail().text, "token=");

    const first = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token, password: "BrandNewPass1" });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token, password: "AnotherPass123" });
    expect(second.status).toBe(400);
  });
});

describe("requireRole guard", () => {
  function buildGuardedApp() {
    const guarded = express();
    guarded.get("/admin-only", requireAuth, requireRole("admin"), (_req, res) => {
      res.status(200).json({ ok: true });
    });
    guarded.use(errorHandler);
    return guarded;
  }

  it("blocks a customer with 403", async () => {
    const registered = await registerUser();
    const token = registered.body.accessToken as string;

    const response = await request(buildGuardedApp())
      .get("/admin-only")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN");
  });

  it("allows an admin", async () => {
    await registerUser();
    await User.updateOne({ email: EMAIL }, { $set: { role: "admin" } });

    const login = await loginUser();
    const token = login.body.accessToken as string;

    const response = await request(buildGuardedApp())
      .get("/admin-only")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
