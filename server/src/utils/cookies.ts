import type { CookieOptions, Response } from "express";
import { env } from "../config/env.js";

export const REFRESH_COOKIE_NAME = "gc_refresh";
export const REFRESH_COOKIE_PATH = "/api/v1/auth";

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.cookieSameSite,
  path: REFRESH_COOKIE_PATH,
};

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: env.refreshTokenTtlMs,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions);
}

export function readRefreshCookie(cookies: unknown): string | null {
  if (typeof cookies !== "object" || cookies === null) return null;
  const value = (cookies as Record<string, unknown>)[REFRESH_COOKIE_NAME];
  return typeof value === "string" && value.length > 0 ? value : null;
}
