# @lot/api

Fastify REST API server for Lusting on Trash guild data.

## Stack

- Node 24, Fastify 5, TypeScript (ESM)
- Prisma 7 with `@prisma/adapter-pg` (Neon Postgres)
- WCL GraphQL v2 via graphql-request
- WowAudit REST API for roster sync

## Structure

- `src/` — Server source code
    - `app.ts` — Fastify app creation, CORS config, route registration
    - `index.ts` — Entry point, listens on PORT (default 4000)
    - `db/` — Prisma client setup
    - `routes/` — API route handlers (`register*Routes` pattern)
    - `jobs/` — Batch sync jobs
    - `wcl/` — Warcraft Logs integration (auth, client, queries)
    - `wowaudit/` — WowAudit API client
- `prisma/` — Schema and migrations
- `scripts/` — Dev/debug utilities

## Code Conventions

- Direct Prisma calls in routes (no service layer)
- Throw HTTP errors with status codes for failures
- Routes export `register*Routes(app: FastifyInstance)` functions
- Use Zod for request validation
- No `any` types

## Key Scripts

```
pnpm run dev          # tsx watch
pnpm run build        # tsup → dist/
pnpm run start        # node dist/index.js
pnpm run typecheck    # tsc --noEmit
pnpm run db:generate  # Generate Prisma client
pnpm run db:migrate   # Create migration (dev)
pnpm run db:sync      # Run character sync
```

## Environment

- `DATABASE_URL` — Neon Postgres connection string
- `WCL_CLIENT_ID` / `WCL_CLIENT_SECRET` — Warcraft Logs OAuth
- `WOWAUDIT_API_KEY` — WowAudit API key
- `CORS_ORIGIN` — Allowed origins (comma-separated, defaults to `http://localhost:3000`)
- `PORT` — Server port (default 4000)

## Deployment

Railway (API only). Build: `db:generate && build`. Pre-deploy: `db:migrate:deploy`.
