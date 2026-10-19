// Durable Object that owns the one long-lived MongoDB (Mongoose) connection for the
// whole Worker.
//
// Why this exists: workerd forbids reusing a TCP socket across request contexts
// ("Cannot perform I/O on behalf of a different request", canceled as "hung"). A
// stateless Worker isolate opens the Mongoose pool during the first request and then the
// socket is dead for the next one. Cloudflare's documented fix for MongoDB (which
// Hyperdrive does not support) is to persist the client inside a Durable Object: a
// single, serialized, long-lived resident that keeps the connection alive.
//
// So both the Express app and the Mongoose connection live here. `cloudflare:node`'s
// `handleAsNodeRequest` bridges this DO's `fetch` to the in-memory `node:http` server
// that runs the Express app. The Worker entry (worker/index.ts) is a thin proxy that
// forwards every request to the singleton instance of this class.
//
// This file is outside `src/`, so it is never part of the Node build and `npm run
// typecheck` / `npm run build` stay untouched. Wrangler bundles it with esbuild, which
// resolves the already-compiled `dist/*.js` files below. Run `npm run build` first.

import { handleAsNodeRequest } from "cloudflare:node";

const PORT = 3000;

interface Bindings {
  MONGODB_URI?: string;
  [key: string]: unknown;
}

// Copy string bindings (vars + secrets) onto `process.env` so the Zod-parsed config in
// `dist/config/env.js` sees them when it evaluates. Under `nodejs_compat` this is usually
// already populated, but a Durable Object is a separate isolate, so we seed it explicitly
// before the config module is imported. Non-string bindings (e.g. the DO namespace) are
// skipped, and a read-only `process.env` is tolerated.
function seedProcessEnv(bindings: Bindings | undefined): void {
  if (!bindings) return;
  let entries: [string, unknown][];
  try {
    entries = Object.entries(bindings);
  } catch {
    return;
  }
  for (const [key, value] of entries) {
    if (typeof value !== "string") continue;
    try {
      process.env[key] = value;
    } catch {
      // process.env may be read-only in some runtimes; the binding is still on `env`.
    }
  }
}

// Types are stripped by esbuild; this class is not part of the Node build.
export class MongoDBDurableObject {
  private readonly ctx: unknown;
  private readonly bindings: Bindings;
  private appReady: Promise<void> | null = null;
  private dbReady: Promise<void> | null = null;
  private listening = false;

  constructor(ctx: unknown, bindings: Bindings) {
    this.ctx = ctx;
    this.bindings = bindings ?? {};
    seedProcessEnv(this.bindings);
  }

  // Build the Express app and boot the Node http shim exactly once per DO instance.
  private ensureApp(): Promise<void> {
    if (!this.appReady) {
      this.appReady = (async () => {
        seedProcessEnv(this.bindings);
        const { buildApp } = await import("../dist/app.js");
        const app = buildApp();
        if (!this.listening) {
          app.listen(PORT);
          this.listening = true;
        }
      })().catch((error: unknown) => {
        console.error("[worker] app startup failed", error);
        this.appReady = null;
      });
    }
    return this.appReady;
  }

  // Connect once per DO instance. Mirrors src/server.ts: a missing MONGODB_URI is
  // allowed (the API still serves /health), and a failed connection is logged rather than
  // fatal. A failed attempt is cleared so the next request retries instead of caching it.
  private ensureDatabase(): Promise<void> {
    if (!this.dbReady) {
      this.dbReady = (async () => {
        seedProcessEnv(this.bindings);
        const { env } = await import("../dist/config/env.js");
        if (!env.MONGODB_URI) {
          return;
        }
        const { connectDatabase } = await import("../dist/config/db.js");
        await connectDatabase(env.MONGODB_URI);
      })().catch((error: unknown) => {
        console.error("[worker] database connection failed", error);
        this.dbReady = null;
      });
    }
    return this.dbReady;
  }

  async fetch(request: Request): Promise<Response> {
    await this.ensureApp();
    await this.ensureDatabase();
    return handleAsNodeRequest(PORT, request);
  }
}
