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

  logger.error({ err: error }, "Unhandled error");

  res.status(500).json({
    message: "Internal server error",
    code: "INTERNAL_ERROR",
  });
};
