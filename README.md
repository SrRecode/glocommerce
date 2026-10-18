# Glocommerce

A MERN e-commerce storefront with an admin dashboard. Cash-on-delivery checkout.

## Status

**Phase 6 complete — the admin dashboard (overview, order management, product and
category CRUD) is green.**

| Phase | Scope | State |
| --- | --- | --- |
| 0 | Design system (`docs/DESIGN.md`) | done |
| 1 | Scaffold client + server, CI, env contract | done |
| 2 | Auth, roles, session | done |
| 3 | Catalog backend (products, categories, search) | done |
| 4 | Orders backend (COD checkout, stock, status) | done |
| 5 | Storefront UI | done |
| 6 | Admin dashboard UI | done |
| 7 | Hardening, performance, uploads | not started |
| 8 | Ship | not started |

## Stack

**Client** — React 19 + TypeScript + Vite 8, Tailwind v4, React Router 8 (data router),
TanStack Query, Zustand (cart), React Hook Form + Zod, Lucide icons, Motion (installed,
not yet used), Vitest + Testing Library. Components are built from the tokens in
`docs/DESIGN.md`; shadcn/ui is a source of ideas, not a look to adopt.

**Server** — Node 22+ with Express 5 + TypeScript (ESM), MongoDB Atlas + Mongoose, Zod,
JWT (access token + refresh token in an httpOnly cookie), bcryptjs, Multer (memory) +
Cloudinary for image uploads, Helmet, CORS allowlist, express-rate-limit, pino +
pino-http, Vitest + Supertest + mongodb-memory-server.

**Deploy** — client on Vercel/Netlify, API on Render/Railway/Fly, database on Atlas.

## Structure

```
Glocommerce/
├─ client/                 React app (storefront + /admin)
│  └─ src/{app,components,features,lib,pages}
├─ server/
│  └─ src/{config,middleware,modules,utils,app.ts,server.ts}
│     ├─ modules/auth/      register/login/refresh/logout/me + email verify + password reset
│     ├─ modules/catalog/   products, categories, search, image uploads
│     └─ modules/orders/    COD checkout, stock reservations, order status
├─ docs/
│  ├─ DESIGN.md            design tokens and component specs
│  └─ PRD.md               requirements (not yet added to the repo)
├─ design/refs/            reference images
├─ .github/workflows/ci.yml
├─ AGENTS.md               agent + contributor conventions
└─ .env.example
```

## Getting started

```bash
npm run install:all                # installs client/ and server/ separately
cp .env.example .env               # then fill in the values
```

Run the two apps in separate terminals:

```bash
npm run dev:server                 # http://localhost:5000  (GET /api/v1/health)
npm run dev:client                 # http://localhost:5173
```

The server boots without `MONGODB_URI` (it logs a warning), but every auth endpoint
needs a database. Set `MONGODB_URI` — tests never touch it and use an in-memory MongoDB
instead.

### Auth

Access tokens live **in memory only** on the client and are sent as `Authorization: Bearer`.
The refresh token is an httpOnly, `Secure` (in production), same-site cookie scoped to
`/api/v1/auth`, so it is never readable from JavaScript. The client restores a session with
two calls on bootstrap — `POST /auth/refresh` to obtain a fresh access token, then
`GET /auth/me` — and coalesces concurrent refreshes so a rotating cookie is never replayed.

Create an admin account (roles are `customer` or `admin`):

```bash
npm --prefix server run seed:admin -- admin@example.com "a-strong-password"
```

Verify everything the way CI does:

```bash
npm run verify                     # lint + typecheck + test + build, both packages
```

Server tests run against a real in-memory `mongod`, downloaded once on first run. The
binary is cached at `server/node_modules/.cache/mongodb-memory-server` and
`server/vitest.config.ts` pins `MONGOMS_DOWNLOAD_DIR` to that absolute path so standalone
runs and root-level invocations share one cache.

### Catalog

Storefront reads and admin writes live behind one set of services:

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/categories` | public | `{ items, total }` (bounded, not paginated) |
| `GET` | `/api/v1/categories/:slug` | public | `{ category }`, product count is active-only |
| `GET` | `/api/v1/products` | public | `active` only; `{ items, page, limit, total }` |
| `GET` | `/api/v1/products/:slug` | public | `{ product }`; drafts 404 |
| `GET/POST/PATCH/DELETE` | `/api/v1/admin/products[/:id]` | admin | includes drafts |
| `GET/POST/PATCH/DELETE` | `/api/v1/admin/categories[/:id]` | admin | delete 409 if products reference it |
| `POST` | `/api/v1/admin/uploads` | admin | multipart `image`; returns `{ image }` |

`GET /products` accepts `q`, `category`, `brand`, `minPrice`, `maxPrice`, `sort`, `featured`,
`status`, `page`, `limit`. Search uses a MongoDB text index, with an escaped-`RegExp`
fallback when the text search returns nothing. Prices are integer minor units (e.g.
`499900` = Rs 4999.00) with a `currency` field.

Uploads go through a storage adapter: with `CLOUDINARY_*` unset the API writes to
`server/uploads` and serves it at `/uploads/<file>`; with those keys set it uploads to
Cloudinary. Images are checked for MIME type, magic bytes, and size (`UPLOAD_MAX_BYTES`).

### Orders

Checkout is cash-on-delivery only. The service re-reads every product and recomputes
prices, line totals, subtotal, shipping, and total server-side — client-sent prices are
ignored. Each line stores a snapshot (`name`, `slug`, `image`, `unitPrice`, `quantity`,
`lineTotal`) so an order survives later product edits or deletion.

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/v1/orders` | public / customer | COD checkout; links to the account when a valid token is present |
| `POST` | `/api/v1/orders/lookup` | public | guest lookup by `orderNumber` **and** `phone` |
| `GET` | `/api/v1/orders/mine` | customer | `{ items, page, limit, total }` |
| `GET` | `/api/v1/orders/mine/:orderNumber` | customer | `{ order }` |
| `GET` | `/api/v1/admin/orders` | admin | `{ items, page, limit, total }` |
| `GET` | `/api/v1/admin/orders/:id` | admin | `{ order }` |
| `PATCH` | `/api/v1/admin/orders/:id/status` | admin | body `{ status, note? }`; illegal moves 409 |

Statuses are `pending → confirmed → shipped → delivered`, plus `cancelled` (only from
`pending` or `confirmed`). Stock is reserved with a conditional `$inc` guarded on
available quantity — there are no multi-document transactions, so a failed line restores
the reservations already taken. `SHIPPING_FLAT_FEE` (minor units) is charged only when
non-zero and `FREE_SHIPPING_THRESHOLD` (0 = disabled) waives it above a subtotal; both
default to free shipping.

A path param that is not a 24-char hex ObjectId returns `400 VALIDATION_ERROR`, matching
the catalog routes rather than 404.

## Documentation

- `docs/DESIGN.md` — palette, type scale, spacing, component specs, a11y targets.
- `docs/PRD.md` — product requirements and phase definitions.
- `AGENTS.md` — conventions, guardrails, and the phase workflow.
