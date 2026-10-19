import type { ErrorRequestHandler } from "express";
import { z } from "zod";
import { logger } from "../config/logger.js";
import { AppError, type FieldErrors } from "../utils/app-error.js";

function fromZodError(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_root";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

// body-parser rejects a malformed JSON/urlencoded body with an error carrying a
// 4xx `status`/`statusCode` and `expose: true`. Without this it falls through to
// the generic 500 branch even though the client is at fault.
function exposedClientStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const { status, statusCode, expose } = error as {
    status?: unknown;
    statusCode?: unknown;
    expose?: unknown;
  };
  const raw = statusCode ?? status;
  if (expose !== true) return undefined;
  if (typeof raw !== "number" || raw < 400 || raw > 499) return undefined;
  return raw;
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) return;

  if (error instanceof z.ZodError) {
    res.status(400).json({
      message: "Validation failed",
      fieldErrors: fromZodError(error),
      code: "VALIDATION_ERROR",
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      message: error.message,
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      code: error.code,
    });
    return;
  }

  const clientStatus = exposedClientStatus(error);
  if (clientStatus) {
    res.status(clientStatus).json({
      message: "Invalid request",
      code: "BAD_REQUEST",
    });
    return;
  }

  logger.error({ err: error }, "Unhandled error");

  res.status(500).json({
    message: "Internal server error",
    code: "INTERNAL_ERROR",
  });
};
