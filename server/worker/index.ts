// Cloudflare Workers entry point.
//
// Mongoose needs one long-lived TCP connection, and workerd forbids reusing a socket
// across request contexts ("Cannot perform I/O on behalf of a different request"). So the
// Express app + Mongoose connection live inside a single Durable Object
// (`MongoDBDurableObject` in ./mongo-do). This entry is a thin proxy that forwards every
// request to that singleton, which keeps the connection alive and pooled.
//
// Run `npm run build` before deploying: the DO imports the compiled `dist/` output.

export { MongoDBDurableObject } from "./mongo-do";

interface Env {
  MONGO_DO: {
    idFromName(name: string): unknown;
    get(id: unknown): { fetch(request: Request): Promise<Response> };
  };
  NODE_ENV?: unknown;
  CLIENT_ORIGIN?: unknown;
  COOKIE_SAME_SITE?: unknown;
  MONGODB_URI?: unknown;
  JWT_ACCESS_SECRET?: unknown;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    // The DO builds the Express app and the config module parses `process.env` once per
    // isolate, and a DO instance (with its isolate's module cache) can outlive a deploy.
    // Keying the singleton by the startup config means changing any var/secret routes to
    // a fresh instance instead of one still serving the config it parsed at boot.
    // idFromName hashes the name, so secret values are not exposed by the object id.
    const configKey = [
      env.NODE_ENV,
      env.CLIENT_ORIGIN,
      env.COOKIE_SAME_SITE,
      env.MONGODB_URI,
      env.JWT_ACCESS_SECRET,
    ].join("|");
    const id = env.MONGO_DO.idFromName(`singleton:${configKey}`);
    return env.MONGO_DO.get(id).fetch(request);
  },
};
