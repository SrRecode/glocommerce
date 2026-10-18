# Glocommerce

A MERN e-commerce storefront with an admin dashboard. Cash-on-delivery checkout.

## Status

**Phase 1 complete — client and server scaffolds are green.**

| Phase | Scope | State |
| --- | --- | --- |
| 0 | Design system (`docs/DESIGN.md`) | done |
| 1 | Scaffold client + server, CI, env contract | done |
| 2 | Auth, roles, session | next |
| 3 | Catalog backend (products, categories, search) | not started |
| 4 | Orders backend (COD checkout, stock, status) | not started |
| 5 | Storefront UI | not started |
| 6 | Admin dashboard UI | not started |
| 7 | Hardening, performance, uploads | not started |
| 8 | Ship | not started |

## Stack

**Client** — React 19 + TypeScript + Vite 8, Tailwind v4, React Router 8 (data router),
TanStack Query, Zustand (cart), React Hook Form + Zod, Lucide icons, Motion (reserved for
Phase 5), Vitest + Testing Library. Components are built from the tokens in
`docs/DESIGN.md`; shadcn/ui is a source of ideas, not a look to adopt.

**Server** — Node 22+ with Express 5 + TypeScript (ESM), MongoDB Atlas + Mongoose, Zod,
JWT (access token + refresh token in an httpOnly cookie), bcryptjs, Multer + Cloudinary
(Phase 7), Helmet, CORS allowlist, express-rate-limit, pino + pino-http, Vitest +
Supertest + mongodb-memory-server.

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

Nothing in the server requires MongoDB yet — it starts without `MONGODB_URI` and logs a
warning, which keeps Phase 1 usable before the database exists.

Verify everything the way CI does:

```bash
npm run verify                     # lint + typecheck + test + build, both packages
```


## Documentation

- `docs/DESIGN.md` — palette, type scale, spacing, component specs, a11y targets.
- `docs/PRD.md` — product requirements and phase definitions.
- `AGENTS.md` — conventions, guardrails, and the phase workflow.
