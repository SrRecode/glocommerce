// Workers-safe stand-in for `pino`, wired via the `alias` map in wrangler.jsonc.
// The Node runtime keeps using the real pino; this module is only ever bundled into the
// Cloudflare Worker, where pino's Node internals (sonic-boom, worker threads, ...) are
// unavailable. It implements just the surface this app uses: a factory plus
// debug/info/warn/error/child emitting JSON lines to the Workers console.

type Level = "debug" | "info" | "warn" | "error" | "silent";

function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    const serialized: Record<string, unknown> = {
      type: value.name,
      message: value.message,
      stack: value.stack,
    };
    const carry = value as unknown as Record<string, unknown>;
    for (const key of ["code", "statusCode", "expose"]) {
      if (carry[key] !== undefined) serialized[key] = carry[key];
    }
    return serialized;
  }
  return value;
}

interface PinoOptions {
  level?: Level | string;
  base?: Record<string, unknown>;
  redact?: { paths: string[]; censor: string };
}

const ORDER: Level[] = ["debug", "info", "warn", "error", "silent"];

function emit(level: Exclude<Level, "silent">, base: Record<string, unknown>, args: unknown[]): void {
  const line: Record<string, unknown> = {
    level,
    time: new Date().toISOString(),
    ...base,
  };
  if (args.length > 0 && typeof args[0] === "string") line.msg = args[0];
  else if (args.length > 0) line.msg = args[0];
  if (args.length > 1) line.args = args.slice(1);

  const out = JSON.stringify(line, replacer);
  if (level === "error") console.error(out);
  else if (level === "warn") console.warn(out);
  else console.log(out);
}

export function pino(options: PinoOptions = {}) {
  const base = options.base ?? {};
  const level = (options.level as Level) ?? "info";
  const threshold = ORDER.indexOf(level);

  const enabled = (l: Level): boolean => level !== "silent" && ORDER.indexOf(l) >= threshold;

  const make = (extraBase: Record<string, unknown>) => {
    const merged = { ...base, ...extraBase };
    return {
      level,
      debug: (...a: unknown[]) => {
        if (enabled("debug")) emit("debug", merged, a);
      },
      info: (...a: unknown[]) => {
        if (enabled("info")) emit("info", merged, a);
      },
      warn: (...a: unknown[]) => {
        if (enabled("warn")) emit("warn", merged, a);
      },
      error: (...a: unknown[]) => {
        if (enabled("error")) emit("error", merged, a);
      },
      child: (b: Record<string, unknown>) => make(b),
    };
  };

  return make({});
}

export default pino;
