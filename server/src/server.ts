import { buildApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

async function start(): Promise<void> {
  if (env.MONGODB_URI) {
    await connectDatabase(env.MONGODB_URI);
  } else if (!env.isTest) {
    logger.warn("MONGODB_URI is not set — starting without a database connection");
  }

  const app = buildApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}/api/v1`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close(() => {
      void disconnectDatabase().finally(() => process.exit(0));
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error: unknown) => {
  logger.error({ err: error }, "Failed to start API");
  process.exit(1);
});
