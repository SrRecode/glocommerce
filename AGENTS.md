# AGENTS.md — Glocommerce

MERN storefront + admin dashboard. Cash-on-delivery only, no online payments.

## Layout

```
/client   React + TS + Vite storefront and admin UI
/server   Node + Express + TS API
/docs     PRD.md, DESIGN.md (sources of truth)
/design   reference images
```

## Commands

Run from the package root the script belongs to, or use the root delegating scripts.

| Task | root | client | server |
| --- | --- | --- | --- |
| install | `npm run install:all` | `npm install` | `npm install` |
| dev | `npm run dev:client` / `dev:server` | `npm run dev` | `npm run dev` |
| build | `npm run build` | `npm run build` | `npm run build` |
| test | `npm test` | `npm test` | `npm test` |
| lint | `npm run lint` | `npm run lint` | `npm run lint` |
| typecheck | `npm run typecheck` | `npm run typecheck` | `npm run typecheck` |
| all of the above | `npm run verify` | — | — |

Packages are deliberately **not** npm workspaces: `client` and `server` keep separate
lockfiles so platform-specific native optional deps (`@rolldown/binding-*`,
`@oxlint/binding-*`) resolve correctly for each. Add a root dependency only if it is
genuinely repo-wide.

Linting is **oxlint** in both packages, not ESLint. Type-checking is `tsc`; the client
builds with `tsc -b`, the server builds with `tsc -p tsconfig.build.json`.

### Server module system

`server` is ESM: `"type": "module"` in `package.json`, with TS `module` and
`moduleResolution` set to `nodenext`. Consequences:

- **Relative imports must carry the `.js` extension** (`./config/env.js`), even though
  the source file is `.ts`. Node resolves the emitted JavaScript.
- Extend `tsconfig.json` for new typecheck paths; emit is configured separately in
  `tsconfig.build.json`, which excludes tests.
- `erasableSyntaxOnly` is on: no `enum`, no `namespace`, no constructor parameter
  properties.
- `dotenv` is loaded from `src/config/env.ts` and reads the **repo-root `.env`**, so run
  the server from anywhere — never add `--env-file` flags.

### Server tests

Tests use `mongodb-memory-server`. `server/vitest.config.ts` pins
`MONGOMS_DOWNLOAD_DIR` to a `node_modules/.cache` path computed from the config file, so
standalone and root-level (`npm --prefix server run test`) runs share one downloaded
`mongod` binary instead of re-downloading it. The binary lives under
`server/node_modules/.cache/mongodb-memory-server` and is wiped on a `node_modules`
reinstall (CI re-downloads; acceptable).

## Conventions

- **TypeScript everywhere.** No `any` without a comment justifying it. Shared API types
  live in one place per app rather than being re-declared at call sites.
- **Backend layering:** `routes` → `validate` (Zod) → `auth`/`role` guard → `controller`
  → `service` → `model`. Controllers stay thin; business rules (stock, pricing, order
  status transitions) live in services.
- **API shape:** base path `/api/v1`. Paginated lists return
  `{ items, page, limit, total }`. Errors return `{ message, fieldErrors?, code }`.
  Bounded, non-paginated lists (currently only `GET /categories`) return
  `{ items, total }` with no `page`/`limit`.
- **Styling:** design tokens from `docs/DESIGN.md` only. No raw hex, no arbitrary
  spacing values, no inline style objects for anything tokenised.
- **Validation:** Zod at every trust boundary — request bodies, query params, env vars.
- **NoSQL injection:** `mongoose.set("sanitizeFilter", true)` is enabled in `config/db.ts`,
  so query filter values have `$`-operators and dots stripped by Mongoose. Keep it on, and
  never hand a raw request object straight to a Mongoose filter.
- **Versions:** install the latest stable release at the time of scaffolding and check
  current docs before writing integration code. Never guess an API from memory.

### Auth and sessions

- Short-lived **access token in memory** (never in `localStorage`), plus a rotating
  **refresh token in an httpOnly/Secure cookie** scoped to `/api/v1/auth`. Requests send
  `credentials: "include"`.
- The API exposes the authed user on `res.locals.user`; read it via `getAuthUser(res)`
  rather than augmenting the Express `Request` type. Role checks use `requireRole`.
- Client bootstrap is two calls — `POST /auth/refresh` then `GET /auth/me` — and
  concurrent refreshes are coalesced into one in-flight request.
- Auth response shapes (`{ user, accessToken }`, `204` logout, `202` for
  forgot-password/resend) are part of the contract; keep client payload types in sync.
- **Cookie-authenticated writes are CSRF-guarded.** Because the refresh cookie is sent
  cross-site in production (`SameSite=None`), `POST /auth/refresh` and `POST /auth/logout`
  mount `assertTrustedOrigin` (`middleware/csrf.ts`): it skips test, allows safe methods,
  and permits only a missing `Origin` or one in `CLIENT_ORIGIN` list — otherwise
  `403 FORBIDDEN`. Add the same guard to any new route that is authenticated purely by
  the refresh cookie.

### Catalog, search, and uploads

- **Prices/currency:** money is stored as an **integer count of minor units** (e.g.
  `499900` = Rs 4999.00) with a separate `currency` field (default `PKR`). Never store or
  compute money as a float.
- **Search:** `GET /products` runs a MongoDB `$text` query when `q` is present. `$text`
  cannot be combined inside `$or`, so a **fallback pass** re-runs an escaped `RegExp` over
  name/slug/brand/description/tags when the text search returns nothing. Default sort with
  `q` is relevance; `sort=` overrides it.
- **Public vs admin reads:** one service entry point takes
  `{ includeUnpublished }`. Storefront reads force it `false` (only `active` products);
  admin reads pass `true`. A forgotten query validation therefore fails closed for the
  storefront and only affects admin listing.
- **Query parsing:** Express 5 `req.query`/`req.params` are getters. Validated values are
  stored on `res.locals.query` / `res.locals.params` and read with `getQuery(res)` /
  `getParams(res)`. **Every route that reads query or params must mount the matching
  `validateQuery` / `validateParams` first** — `getQuery` returns `undefined` otherwise,
  which surfaces as a 500 rather than a 400.
- **Images:** storage goes through an adapter (`storage.service.ts`). With no
  `CLOUDINARY_*` env vars it writes to `server/uploads` and serves `/uploads/<file>`
  statically; with them set it uploads to Cloudinary. Upload middleware enforces a MIME
  allowlist **plus** a magic-byte check **plus** `UPLOAD_MAX_BYTES` (`multer` memory
  storage, 1 file), then re-reads the buffer with `image-size` and rejects images over
  8192px on a side or 40,000,000px total. Generated filenames are never taken from the
  client. Note: `storage.service.ts`'s MIME allowlist deliberately excludes SVG — only
  raster formats are accepted.
- **Duplicate names:** name uniqueness is enforced **in the service** with a
  case-insensitive regex check (not a Mongo `unique` index, which is case-sensitive), so a
  duplicate name returns `409` instead of a silent `201` with a suffixed slug. The
  `E11000` catch on the slug stays as a backstop.
- **Unique slugs:** slugs are generated with `slugify` and de-duplicated with a bounded
  suffix loop (`-2`, `-3`, …). Do not add a `unique: true` index on `name`.

### Orders, stock, and shipping

- **Status machine:** `pending → confirmed → shipped → delivered`, plus `cancelled`.
  Cancelling is allowed only from `pending` or `confirmed`; `delivered` and `cancelled`
  are terminal. Transitions are enforced in the service against
  `ORDER_STATUS_TRANSITIONS`; an illegal move returns `409 INVALID_STATUS_TRANSITION`.
- **Server-computed money:** at checkout the service re-reads each product and recomputes
  prices, line totals, subtotal, shipping, and total from the database. Client-supplied
  prices are ignored.
- **Line snapshots:** each order item copies `name`, `slug`, `image`, `unitPrice`,
  `quantity`, and `lineTotal` at purchase time, so the order survives product edits or
  deletion. The `product` ref is therefore nullable.
- **No transactions:** `mongodb-memory-server` runs a stand-alone node, not a replica set,
  so multi-document transactions are unavailable. Stock is reserved with a conditional
  `findOneAndUpdate` (`$inc` guarded on `stock: { $gte: quantity }`); if any line fails,
  the reservations already taken are compensated by restoring stock. Order creation
  failing after reservation does the same. Do not read-then-write stock.
- **Duplicate lines rejected:** a repeated `productId` in one order is a `400 BAD_REQUEST`.
- **Order numbers:** `GC-<base36 time>-<random hex>`, backed by a unique index. Creation
  retries a bounded number of times on a duplicate-key error and only then surfaces
  `500 ORDER_NUMBER_GENERATION_FAILED`.
- **Guest lookup:** `POST /orders/lookup` needs the order number **and** phone together;
  the phone is normalised (non-digits stripped, leading `+` kept) on both write and read.
- **Shipping:** free by default. `SHIPPING_FLAT_FEE` (minor units) is charged only when
  non-zero and `FREE_SHIPPING_THRESHOLD` (0 = disabled) waives it above a subtotal.
  `calculateShippingFee` is the single place this is decided.
- **Malformed ids:** a path param that is not a 24-char hex ObjectId fails
  `objectIdSchema` and returns **`400 VALIDATION_ERROR`**, not 404 — consistent with the
  catalog routes. The service-level `Types.ObjectId.isValid` 404 guard is a defensive
  fallback that route validation normally reaches first.
- **Abuse limits:** the whole orders router mounts `ordersRateLimit`
  (`order.routes.ts`), so both `POST /orders` and `POST /orders/lookup` are throttled
  together. Add new public order routes under the same router so they inherit it.
- **Read indexes:** order queries are covered by `{ user, createdAt }`, `{ status,
  createdAt }`, and `{ createdAt: -1 }` (the default admin sort). Keep new order list
  queries backed by an index.

### Storefront UI (client)

- **Routes** (storefront, inside `StorefrontLayout`): `/` (home), `/products` (catalogue),
  `/products/:slug` (product), `/cart`, `/checkout`, `/orders/:orderNumber` (confirmation),
  `/orders/lookup` (guest tracking), `/account/orders` (authed list). `*` renders
  `NotFoundPage` outside the layout. `StorefrontLayout` owns the single `<main id="main">`;
  **pages return a fragment or a root `<div>` and never render their own `<main>`.**
- **Money and dates are formatted locally, not with `Intl`.** `lib/money.ts` formats from
  the integer minor-units value with a per-currency fraction and symbol table;
  `lib/dates.ts` formats ISO strings in UTC against a fixed month list. This keeps output
  deterministic across Node/browsers and avoids timezone and locale drift in tests. Do not
  introduce `Intl.NumberFormat` / `toLocaleDateString`.
- **Cart** lives in `features/cart/cart-store.ts` (Zustand, persisted to `localStorage`
  under `glocommerce-cart`). Read totals through the exported selectors
  `selectTotalItems`, `selectSubtotal`, `selectCurrency` — never recompute inline.
- **Order rendering is shared.** `components/OrderSummary.tsx` renders an order on both the
  confirmation and lookup pages. Status pill tones live in
  `features/orders/status-tones.ts`, **not** in a component file.
- **One concern per file for oxlint's `react/only-export-components`:** a `.tsx` component
  file exports only its component (plus `type` exports and trivial-literal `const`s). Any
  non-trivial shared value (a `cva` variant map, `ORDER_STATUS_TONES`) lives in a sibling
  `.ts` module (`button-styles.ts`, `status-tones.ts`). `allowConstantExport` does not
  cover non-trivial object literals.
- **Query keys** are declared inline with their page's `useQuery` call; shared catalog
  keys live in `features/catalog/queries.ts`.

### Admin UI (client)

- **Routes:** `/login` (child of `StorefrontLayout`) and `/admin` wrapped in
  `<AdminGuard><AdminLayout /></AdminGuard>`, with children `/admin` (overview),
  `/admin/orders`, `/admin/orders/:id`, `/admin/products`, `/admin/products/new`,
  `/admin/products/:id/edit`, `/admin/categories`.
- **`AdminGuard` gates on `useAuth().user?.role`.** Guests are redirected to `/login`
  (`<Navigate to="/login" replace />`); signed-in non-admins see an `EmptyState`
  (`"Administrators only"`); loading shows a `Spinner` with an accessible name. This is a
  UI check only — the server still enforces admin on every write.
- **`AdminLayout` owns its own `<main id="main">`** (the storefront layout is not
  mounted here) and renders the persistent 240px (`w-60`) left rail plus a sticky top bar
  with sign-out. Admin pages use the `mx-auto w-full max-w-storefront px-6 py-10
  lg:px-10` container and never render their own `<main>`.
- **Order status transitions are mirrored client-side** in
  `features/orders/transitions.ts` (`ORDER_STATUS_TRANSITIONS`/`nextStatuses`), matching
  the server's `order.types.ts`. The server remains the authority; an illegal move still
  returns `409`.
- **Admin data hooks live in `features/admin/queries.ts`** (`adminKeys` plus product,
  category, and order queries and mutations); every mutation invalidates `adminKeys.all`.
- **Product images** are URL fields with an upload button that POSTs to
  `/api/v1/admin/uploads` and appends `{ url, alt: "" }` to the form's `images`. Product
  and category writes are JSON, not multipart.

## Guardrails

- **Never trust the client** for price, total, stock, or role. Recalculate server-side
  on every write.
- **Stock decrements are atomic** — conditional `$inc` guarded on available quantity, or
  a transaction. No read-then-write.
- **Role checks happen server-side**, in the guard, not by hiding UI.
- **Uploads:** MIME allowlist plus magic-byte check plus a size cap. Client-supplied
  filenames are never used as paths.
- **Secrets** live in `.env` only, which is gitignored. `.env.example` carries keys with
  placeholder values and must stay current.
- **Guest order lookup** requires order number *and* phone together.

## Workflow

One phase per session. Plan first, wait for approval, then implement. Each phase ends
with lint + typecheck + tests green and a single conventional commit.

Out of scope unless explicitly requested: online payments, multi-vendor, product variant
matrices, multi-language, push notifications.
