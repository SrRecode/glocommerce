# Deploy

Glocommerce ships as three independent pieces:

| Piece | Host | Config file |
| --- | --- | --- |
| Storefront + admin (SPA) | Vercel | `client/vercel.json` |
| API (Express + TS, Docker) | Render | `render.yaml`, `server/Dockerfile` |
| Database | MongoDB Atlas | none (connection string only) |

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
2. Render API (it will fail its health check until the database is reachable —
   watch the deploy log).
3. Seed the admin account: `npm run seed:admin` in `server` with
   `MONGODB_URI` pointed at Atlas.
4. Vercel client with `VITE_API_BASE_URL` set to the Render URL.
5. Put the final Vercel origin into `CLIENT_ORIGIN` on Render and redeploy the API.

## 5. Verify

```
SMOKE_API_BASE_URL=https://<api-host>/api/v1 npm run smoke
```

Checks `GET /api/v1/health` and `GET /api/v1/products?limit=1`. Then, in the
browser: load the storefront, log in as admin, confirm the product list and
place a cash-on-delivery order end to end.

## 6. Rollback

- **API**: Render → service → Deploys → pick the previous build → *Redeploy*.
- **Client**: Vercel → project → Deployments → previous deployment → *Promote to Production*.
- **Database**: schema changes are additive; no migration step is required for rollback.

## 7. Release tags

Each shipped phase is tagged (`v1.0.0` for the initial release). Tag the commit
that is deployed so a rollback target maps to a known revision:

```
git tag v1.0.0
git push origin v1.0.0
```
