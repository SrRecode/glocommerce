// Workers-safe stand-in for `pino-http`, wired via the `alias` map in wrangler.jsonc.
// The real pino-http crashes at import time on workerd; this middleware logs one JSON line
// per request using the logger handed in by app.ts.

interface PinoHttpOptions {
  logger?: {
    info?: (...a: unknown[]) => void;
  };
}

interface MinimalRequest {
  method?: string;
  url?: string;
}

interface MinimalResponse {
  statusCode?: number;
  on(event: string, listener: () => void): void;
}

export function pinoHttp(options: PinoHttpOptions = {}) {
  const log = options.logger;

  return function pinoHttpMiddleware(
    req: MinimalRequest,
    res: MinimalResponse,
    next: () => void,
  ): void {
    const start = Date.now();
    const method = req.method ?? "GET";
    const url = req.url ?? "/";

    res.on("finish", () => {
      const line = `${method} ${url} ${res.statusCode ?? 0} ${Date.now() - start}ms`;
      if (typeof log?.info === "function") log.info(line);
      else console.log(line);
    });

    next();
  };
}

export default pinoHttp;
