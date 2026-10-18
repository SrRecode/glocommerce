import { config as loadEnvFile } from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

loadEnvFile({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const DEVELOPMENT_ACCESS_SECRET = "glocommerce-development-access-secret-not-for-production";
const DEFAULT_CLIENT_ORIGIN = "http://localhost:5173";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_ORIGIN: z.string().default(DEFAULT_CLIENT_ORIGIN),
  MONGODB_URI: z.string().min(1).optional(),

  // Auth. The access secret is mandatory in production; dev and test fall back to a
  // well-known local secret so the API can boot without a hand-written .env.
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  EMAIL_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(60),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  // Catalog uploads. When all three Cloudinary keys are set the storage adapter
  // uploads to Cloudinary; otherwise it writes to the local uploads directory.
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${details}`);
}

const raw = parsed.data;
const isProduction = raw.NODE_ENV === "production";
const isTest = raw.NODE_ENV === "test";

if (isProduction && !raw.JWT_ACCESS_SECRET) {
  throw new Error(
    "Invalid environment configuration:\n  JWT_ACCESS_SECRET: required in production (min 32 characters)",
  );
}

const clientOrigins = raw.CLIENT_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  ...raw,
  isProduction,
  isTest,
  JWT_ACCESS_SECRET: raw.JWT_ACCESS_SECRET ?? DEVELOPMENT_ACCESS_SECRET,
  clientOrigins,
  clientUrl: clientOrigins[0] ?? DEFAULT_CLIENT_ORIGIN,
  // Cross-site deploys (client and API on different domains) need SameSite=None + Secure.
  cookieSameSite: raw.COOKIE_SAME_SITE ?? (isProduction ? "none" : "lax"),
  refreshTokenTtlMs: raw.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  emailTokenTtlMs: raw.EMAIL_TOKEN_TTL_MINUTES * 60 * 1000,
  passwordResetTtlMs: raw.PASSWORD_RESET_TTL_MINUTES * 60 * 1000,
  // Keep the test suite fast; production hashes stay at a defensible cost.
  bcryptCost: isTest ? 4 : 12,
  cloudinaryEnabled: Boolean(
    raw.CLOUDINARY_CLOUD_NAME && raw.CLOUDINARY_API_KEY && raw.CLOUDINARY_API_SECRET,
  ),
  uploadsDir: fileURLToPath(new URL("../../uploads", import.meta.url)),
} as const;

export type Env = typeof env;
