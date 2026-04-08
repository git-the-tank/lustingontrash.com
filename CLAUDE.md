# parseboard Development Guidelines

## Commands

- Always use `pnpm` (not npm)
- Always use `pnpm run <script>` instead of `pnpm <script>` shorthand
- Run `pnpm run format` after making changes
- Run `pnpm run check` before committing (runs format:check + typecheck)

### Key Scripts

```
pnpm run dev              # Start both server and client
pnpm run dev:server       # Fastify on port 4000
pnpm run dev:client       # Vite on port 3000 (proxies /api to 4000)
pnpm run build            # Build client + server for production
pnpm run start            # Run production build
pnpm run check            # Format check + typecheck
pnpm run db:generate      # Generate Prisma client
pnpm run db:migrate       # Create migration (dev)
pnpm run db:migrate:deploy # Apply migrations (prod)
pnpm run db:sync          # Run character sync manually
```

## Tech Stack

- **Backend**: Node 24, Fastify, REST API, TypeScript (ESM)
- **Frontend**: React 19, Vite, Tailwind CSS v4
- **Database**: Neon Postgres via Prisma ORM
- **WCL API**: GraphQL v2 consumed via graphql-request
- **Deployment**: Railway (single service — Fastify serves API + SPA)

## Architecture

Single repo, single `package.json`. Code lives in `src/server` and `src/client`.

- In dev: Vite proxies `/api/*` to Fastify
- In prod: Fastify serves the built SPA via `@fastify/static`
- WCL data is synced via batch jobs, stored in Postgres, served via REST

## Code Style

- No `any` types in TypeScript
- Explicit return types for public functions
- Files: `PascalCase.tsx` (components), `camelCase.ts` (utilities)
- Types: `PascalCase` (no `I` prefix)
- TODOs must use `TODO(#N)` format referencing a real GitHub issue

## Backend (src/server)

- Direct Prisma calls in routes (no service layer)
- Throw HTTP errors with status codes for failures
- Routes export `register*Routes(app: FastifyInstance)` functions
- Use Zod for request validation

## Frontend (src/client)

- Desktop-only styling
- Explicit `isLoading` state (no Suspense for data)
- Local state preferred (`useState`/`useReducer`)
- Plain `fetch` for API calls (no GraphQL client on frontend)

## Database

- Use Neon dev branch for development (not production branch)
- Prisma with `@prisma/adapter-pg` driver adapter
- CUID primary keys, `@db.Timestamptz(3)` for timestamps
- Generated client outputs to `src/generated/prisma`

## Git

- Conventional commits: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `chore`, `docs`
- Do not add any co-author lines in commit messages
- Prefer `git add <file>` over `git add .`

## Security

- Never commit `.env` files
- WCL credentials and DATABASE_URL stay in environment only
