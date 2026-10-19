import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "../src/app.js";
import { connectDatabase } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import { logger } from "../src/config/logger.js";

// Vercel invokes this default export once per request with Node's raw
// request/response; the Express app is callable with the same pair.
const app = buildApp();
const handle = app as unknown as (req: IncomingMessage, res: ServerResponse) => void;

// A warm serverless instance is reused across requests, so the connection is
// cached instead of reconnecting on every invocation.
let database: Promise<void> | null = null;

function ensureDatabase(): Promise<void> {
  if (!env.MONGODB_URI) return Promise.resolve();
  database ??= connectDatabase(env.MONGODB_URI);
  return database;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    await ensureDatabase();
  } catch (error) {
    // Serve anyway: /api/v1/health must stay up even if Atlas is unreachable.
    logger.error({ err: error }, "MongoDB connection failed");
  }

  handle(req, res);
}
