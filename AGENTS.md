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
  allowlist **plus** a magic-byte check **plus** `UPLOAD_MAX_BYTES`; generated filenames
  are never taken from the client.
- **Duplicate names:** name uniqueness is enforced **in the service** with a
  case-insensitive regex check (not a Mongo `unique` index, which is case-sensitive), so a
  duplicate name returns `409` instead of a silent `201` with a suffixed slug. The
  `E11000` catch on the slug stays as a backstop.
- **Unique slugs:** slugs are generated with `slugify` and de-duplicated with a bounded
  suffix loop (`-2`, `-3`, …). Do not add a `unique: true` index on `name`.

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
