# Deploy

Glocommerce ships as three independent pieces:

| Piece | Host | Config file |
| --- | --- | --- |
| Storefront + admin (SPA) | Vercel | `client/vercel.json` |
| API (Express + TS, Docker) | Render | `render.yaml`, `server/Dockerfile` |
| API (same code, serverless) | Vercel *or* any Node host | `server/vercel.json`, `server/api/[...path].ts` |
| API (same code, Workers) | Cloudflare Workers (Durable Object) | `server/wrangler.jsonc`, `server/worker/` |
| Database | MongoDB Atlas | none (connection string only) |

The API has three interchangeable deploy targets: a long-running Docker image
(Render, see §2), a serverless function (Vercel, fallback — see §2a), and a
Cloudflare Worker (§2b) that runs the same Express app inside a Durable Object.
All three run the code in `server/src` unchanged.

Nothing deploys from CI. `ci.yml` only lints, typechecks, tests and builds both
packages; both hosts deploy from a Git push to `main`.

## 1. Database — MongoDB Atlas

1. Create a free (M0) cluster.
2. Create a database user with a strong password.
3. Network access: allow `0.0.0.0/0` (Render's egress IPs are not fixed) or a
   Render static outbound IP range if the plan provides one.
4. Copy the connection string into the API's `MONGODB_URI`, including the
   database name, e.g. `.../glocommerce?retryWrites=true&w=majority`.

## 2. API — Render

Create the service from the blueprint (`render.yaml`) — Render reads it from the
repository root. Manual setup is equivalent:

- Type: Web Service · Runtime: Docker
- Dockerfile path: `server/Dockerfile` · Docker context: `server`
- Health check: `/api/v1/health`
- `PORT` is injected by Render and honoured by `server/src/server.ts` — do not set it.

Required environment variables:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas connection string (secret) |
| `JWT_ACCESS_SECRET` | 64-char random string (secret) — `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_ORIGIN` | Deployed SPA origin, comma-separated for several |
| `COOKIE_SAME_SITE` | `none` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary dashboard (secret) |
| `CLOUDINARY_API_KEY` | Cloudinary dashboard (secret) |
| `CLOUDINARY_API_SECRET` | Cloudinary dashboard (secret) |

`render.yaml` sets `NODE_ENV` and `COOKIE_SAME_SITE`; the rest are marked
`sync: false` so Render prompts for them instead of storing them in Git.

### Why these values matter

- **`COOKIE_SAME_SITE=none`** — the SPA and API are on different sites, so the
  refresh-token cookie must be `None; Secure` or the browser drops it. Render
  terminates TLS, so `Secure` is present.
- **`trust proxy`** — `server/src/app.ts` enables it when `NODE_ENV=production`,
  so rate limiting sees the real client IP behind Render's proxy.
- **Cloudinary** — Render's disk is ephemeral. With the Cloudinary variables set,
  `storage.service.ts` uploads there; without them it writes to `/app/uploads`,
  which is lost on every deploy. Set them for production.

## 2a. API — Vercel serverless (fallback)

Use this when Render asks for a card. The same Express app runs as one
serverless function; no code in `server/src` changes.

- **Files:** `server/api/[...path].ts` is the Vercel entry point (a catch-all so
  the original path, e.g. `/api/v1/products`, reaches `apiV1Router` unchanged).
  It builds the app once per instance and caches the Mongoose connection across
  warm invocations; a database failure is logged but the app still serves, so
  `/api/v1/health` stays up. `server/vercel.json` sets `framework: null` and a
  30-second `maxDuration`.
- **Project settings:** create a *separate* Vercel project with **Root Directory**
  `server` and no framework preset. Do not deploy it from the repo root — the
  client project owns the root.
- **Environment variables:** the same set as §2, minus `PORT` (Vercel manages it).
  `CLIENT_ORIGIN` and `COOKIE_SAME_SITE=none` apply unchanged.
- **tsconfig:** `server/tsconfig.json` includes `api` for type-checking;
  `server/tsconfig.build.json` excludes `api` and owns `rootDir: src`, so the
  Docker/`dist` build is unaffected.
- **Caveats:** serverless is stateless, so the in-memory rate-limit store is
  per-instance and the local `uploads/` fallback is per-instance and ephemeral —
  **Cloudinary is required**. Cold starts plus the Atlas handshake can add a few
  seconds to the first request.

## 2b. API — Cloudflare Workers (Durable Object)

Card-free API host. The same Express app from `server/src` runs on Workers via
`nodejs_compat`. Because Mongoose needs a long-lived TCP socket and workerd
forbids reusing a socket across request contexts, the app and the Mongoose
connection live inside a **singleton Durable Object** rather than in the Worker's
global scope.

- **Entry point:** `server/worker/index.ts` is a thin proxy — it re-exports
  `MongoDBDurableObject` and forwards every request to a singleton DO. The DO name
  is derived from the startup config (`NODE_ENV`, `CLIENT_ORIGIN`, `COOKIE_SAME_SITE`,
  `MONGODB_URI`, `JWT_ACCESS_SECRET`) so that changing any var or secret routes to a
  fresh instance — see the stale-config caveat below.
- **The Durable Object:** `server/worker/mongo-do.ts` builds the Express app
  (`buildApp()` → `app.listen()`), connects Mongoose, then serves each request
  with `handleAsNodeRequest(PORT, request)` from `cloudflare:node`. Both are built
  once per DO instance, so the connection is pooled and reused.
- **`process.env`:** the DO copies its string bindings onto `process.env` before
  importing `src/config/env.js`, so the Zod env schema sees the secrets
  (the main Worker isolate does not share them).
- **Stale-config caveat:** a Durable Object instance — and the isolate module cache
  it lives in — can outlive a deploy, so an instance created before a `vars`/secret
  change keeps serving the config it parsed at boot (this is what made an early
  `CLIENT_ORIGIN` change appear to be ignored: the app kept falling back to the
  `http://localhost:5173` default and rejected the real origin). The
  config-derived DO name above is the fix — a config change yields a different
  object id and therefore a brand-new instance. Do not revert it to a fixed
  `"singleton"` name; do not cache the parsed env outside the DO.
- **`wrangler.jsonc`:** declares the `MONGO_DO` binding and a `migrations` entry
  (`new_sqlite_classes: ["MongoDBDurableObject"]` — SQLite-backed, available on
  the Free plan; no DO storage is actually used).
- **Build first:** the Worker imports the compiled output, so run
  `npm run build` before `wrangler deploy` (the `cf:deploy` script does this).
- **Local dev:** `npm run cf:dev` (secrets from the gitignored `server/.dev.vars`).
- **SRV caveat:** workerd cannot resolve `mongodb+srv://` (`querySRV EBADQUERY`).
  Set `MONGODB_URI` to the **non-SRV seed list** form
  (`mongodb://user:pass@ac-xxx-shard-00-00...,-01...,-02.../glocommerce?tls=true&authSource=admin&retryWrites=true&w=majority`)
  and let the driver discover the replica set. The same applies to the secret
  below.
- **pino:** `wrangler.jsonc` aliases `pino` / `pino-http` to the Worker-safe shims
  in `server/worker/shims/`. Do not remove the `alias` block.

Deploy:

```
cd server
npx wrangler login                      # or set CLOUDFLARE_API_TOKEN
npx wrangler secret put MONGODB_URI     # non-SRV seed list (see SRV caveat)
npx wrangler secret put JWT_ACCESS_SECRET
npx wrangler secret put CLOUDINARY_CLOUD_NAME
npx wrangler secret put CLOUDINARY_API_KEY
npx wrangler secret put CLOUDINARY_API_SECRET
npm run cf:deploy                       # runs `npm run build` then `wrangler deploy`
```

`CLIENT_ORIGIN`, `COOKIE_SAME_SITE` and `NODE_ENV` come from the `vars` block in
`wrangler.jsonc`; update `CLIENT_ORIGIN` there (or with `wrangler secret put`) once
the SPA origin is known, then redeploy. You do **not** need to touch the DO name when
you change a var or secret: the name is derived from the config, so the next request
boots a fresh instance that re-parses the new value (see the stale-config caveat in
§2b). Do **not** set `PORT`.

## 3. Client — Vercel

- Import the repository, set **Root Directory** to `client` (or deploy with
  `client/vercel.json` at the app root).
- Framework preset: Vite. Build `npm run build`, output `dist` (already in
  `client/vercel.json`).
- Environment variable:

| Variable | Value |
| --- | --- |
| `VITE_API_BASE_URL` | `https://<api-host>/api/v1` |

`vercel.json` rewrites every path to `index.html` so deep links such as
`/products/foo` and `/admin/orders/123` resolve through the SPA router.

## 4. First-deploy order

1. Atlas cluster and user.
2. API — Cloudflare Workers (§2b), Render (§2) or Vercel serverless (§2a).
   Render will fail its health check until the database is reachable — watch the
   deploy log.
3. Seed the admin account: `npm run seed:admin` in `server` with
   `MONGODB_URI` pointed at Atlas.
4. Vercel client with `VITE_API_BASE_URL` set to the API URL.
5. Put the final Vercel origin into `CLIENT_ORIGIN` on the API host and redeploy.

## 5. Verify

```
SMOKE_API_BASE_URL=https://<api-host>/api/v1 npm run smoke
```

Checks `GET /api/v1/health` and `GET /api/v1/products?limit=1`. Then, in the
browser: load the storefront, log in as admin, confirm the product list and
place a cash-on-delivery order end to end.

## 6. Rollback

- **API**: Render → service → Deploys → pick the previous build → *Redeploy*.
  (Vercel serverless instead: project → Deployments → previous → *Promote to
  Production*. Cloudflare Workers instead: `npx wrangler rollback` in `server`,
  or the Deployments tab in the dashboard → *Rollback*.)
- **Client**: Vercel → project → Deployments → previous deployment → *Promote to Production*.
- **Database**: schema changes are additive; no migration step is required for rollback.

## 7. Release tags

Each shipped phase is tagged (`v1.0.0` for the initial release). Tag the commit
that is deployed so a rollback target maps to a known revision:

```
git tag v1.0.0
git push origin v1.0.0
```
