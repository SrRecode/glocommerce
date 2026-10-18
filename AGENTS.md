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

## Conventions

- **TypeScript everywhere.** No `any` without a comment justifying it. Shared API types
  live in one place per app rather than being re-declared at call sites.
- **Backend layering:** `routes` → `validate` (Zod) → `auth`/`role` guard → `controller`
  → `service` → `model`. Controllers stay thin; business rules (stock, pricing, order
  status transitions) live in services.
- **API shape:** base path `/api/v1`. Lists return
  `{ items, page, limit, total }`. Errors return `{ message, fieldErrors?, code }`.
- **Styling:** design tokens from `docs/DESIGN.md` only. No raw hex, no arbitrary
  spacing values, no inline style objects for anything tokenised.
- **Validation:** Zod at every trust boundary — request bodies, query params, env vars.
- **Versions:** install the latest stable release at the time of scaffolding and check
  current docs before writing integration code. Never guess an API from memory.

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
