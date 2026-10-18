import type { RequestHandler } from "express";
import type { ZodType } from "zod";

/**
 * Parses `req.body` with a Zod schema. On failure the ZodError is forwarded to
 * the error handler, which renders the shared 400 VALIDATION_ERROR contract.
 * On success `req.body` is replaced with the parsed, coerced output.
 */
export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }

    req.body = result.data;
    next();
  };
}
