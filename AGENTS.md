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

Run from the package root they belong to.

| Task | client | server |
| --- | --- | --- |
| dev | `npm run dev` | `npm run dev` |
| build | `npm run build` | `npm run build` |
| test | `npm test` | `npm test` |
| lint | `npm run lint` | `npm run lint` |
| typecheck | `npm run typecheck` | `npm run typecheck` |

Scaffold pending — verify these scripts exist in each `package.json` before relying on
them, and update this table when they change.

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
