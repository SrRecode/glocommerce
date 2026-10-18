import type { RequestHandler, Response } from "express";
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

/**
 * Parses `req.query` with a Zod schema. Express 5 exposes `req.query` as a
 * read-only getter, so the parsed value is stored on `res.locals.query` and read
 * back with `getQuery`. On failure the ZodError renders the shared 400 contract.
 */
export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(result.error);
      return;
    }

    res.locals.query = result.data;
    next();
  };
}

/** Reads the value produced by `validateQuery`, typed at the call site. */
export function getQuery<T>(res: Response): T {
  return res.locals.query as T;
}

/**
 * Parses route params with a Zod schema, storing the parsed value on
 * `res.locals.params` so route params are never mutated in place.
 */
export function validateParams<T>(schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(result.error);
      return;
    }

    res.locals.params = result.data;
    next();
  };
}

/** Reads the value produced by `validateParams`, typed at the call site. */
export function getParams<T>(res: Response): T {
  return res.locals.params as T;
}
