import { pino } from "pino";
import { env } from "./env.js";

const level = env.isTest ? "silent" : env.isProduction ? "info" : "debug";

export const logger = pino({
  level,
  base: { service: "glocommerce-api", env: env.NODE_ENV },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
    ],
    censor: "[redacted]",
  },
});
