import type { Request } from "express";

// express-rate-limit's `draft-8` headers hash the partition key with SHA-256, and
// its default keyGenerator derives that key from `req.ip` — calling
// `validations.ip(req.ip)` first, which throws ERR_ERL_UNDEFINED_IP_ADDRESS when
// the IP is missing. That leaves the key undefined and crashes the hashing step
// (`Hash.update(undefined)`), surfacing as a 500. Supplying our own keyGenerator
// bypasses that default entirely and guarantees a defined string, preferring the
// client IP the edge proxy forwards in production.
function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.split(",")[0]?.trim() || undefined;
}

export function clientRateLimitKey(req: Request): string {
  return (
    firstHeaderValue(req.headers["cf-connecting-ip"]) ??
    firstHeaderValue(req.headers["x-forwarded-for"]) ??
    req.ip ??
    "unknown"
  );
}
