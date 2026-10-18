import cookieParser from "cookie-parser";
import cors, { type CorsOptions } from "cors";
import express, { type Express } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { apiV1Router } from "./routes.js";
import { AppError } from "./utils/app-error.js";

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || env.clientOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new AppError(403, "CORS_NOT_ALLOWED", `Origin ${origin} is not allowed`));
  },
  credentials: true,
};

export function buildApp(): Express {
  const app = express();

  if (env.isProduction) app.set("trust proxy", 1);

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.use(
    "/api",
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      skip: (req) =>
        env.isTest || req.originalUrl.split("?")[0] === "/api/v1/health",
    }),
  );

  app.use("/api/v1", apiV1Router);

  // Locally stored product images are served straight from disk; when Cloudinary
  // is configured the stored URLs are absolute and this mount is unused.
  app.use("/uploads", express.static(env.uploadsDir));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
