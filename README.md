# Glocommerce

A MERN e-commerce storefront with an admin dashboard. Cash-on-delivery checkout.

## Status

**Phase 0 complete — design system approved. Phase 1 (scaffold) next.**

| Phase | Scope | State |
| --- | --- | --- |
| 0 | Design system (`docs/DESIGN.md`) | done |
| 1 | Scaffold client + server, CI, env contract | in progress |
| 2 | Auth, roles, session | not started |
| 3 | Catalog backend (products, categories, search) | not started |
| 4 | Orders backend (COD checkout, stock, status) | not started |
| 5 | Storefront UI | not started |
| 6 | Admin dashboard UI | not started |
| 7 | Hardening, performance, uploads | not started |
| 8 | Ship | not started |

## Stack

**Client** — React + TypeScript + Vite, Tailwind, shadcn/ui, React Router,
TanStack Query, Zustand (cart), React Hook Form + Zod, Lucide, Vitest + Testing Library.

**Server** — Node + Express + TypeScript, MongoDB Atlas + Mongoose, Zod, JWT (access +
refresh cookie), bcrypt/argon2, Multer + Cloudinary, Helmet, CORS allowlist,
express-rate-limit, pino, Vitest + Supertest.

**Deploy** — client on Vercel/Netlify, API on Render/Railway/Fly, database on Atlas.

## Structure

```
Glocommerce/
├─ client/                 React app (storefront + /admin)
│  └─ src/{app,components,features,lib,pages}
├─ server/
│  └─ src/{config,middleware,modules,utils,app.ts,server.ts}
├─ docs/
│  ├─ DESIGN.md            design tokens and component specs
│  └─ PRD.md               requirements
├─ design/refs/            reference images
├─ AGENTS.md               agent + contributor conventions
└─ .env.example
```

## Getting started

Setup steps are added in Phase 1 once the workspaces exist. Until then the only
documented entry point is `docs/DESIGN.md`.

## Documentation

- `docs/DESIGN.md` — palette, type scale, spacing, component specs, a11y targets.
- `docs/PRD.md` — product requirements and phase definitions.
- `AGENTS.md` — conventions, guardrails, and the phase workflow.
