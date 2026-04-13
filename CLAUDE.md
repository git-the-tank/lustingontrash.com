# lustingontrash.com Development Guidelines

## Commands

- Always use `pnpm` (not npm)
- Always use `pnpm run <script>` instead of `pnpm <script>` shorthand
- Run `pnpm run format` after making changes
- Run `pnpm run check` before committing (runs format:check + typecheck)

### Key Scripts (root)

```
pnpm run dev              # Start both server and client
pnpm run dev:server       # API only
pnpm run dev:client       # Web only
pnpm run build            # Build client + server
pnpm run check            # Format check + typecheck
pnpm run db:generate      # Generate Prisma client
pnpm run db:migrate       # Create migration (dev)
pnpm run db:sync          # Run character sync
```

## Architecture

pnpm workspace monorepo. See per-package CLAUDE.md for details.

- `apps/api` — Fastify REST API (deploys to Railway)
- `apps/web` — Landing page + parseboard SPA (deploys to Cloudflare Pages)
- `packages/shared` — Shared config and types

## Code Style

- No `any` types in TypeScript
- Explicit return types for public functions
- Files: `PascalCase.tsx` (components), `camelCase.ts` (utilities)
- Types: `PascalCase` (no `I` prefix)
- TODOs must use `TODO(#N)` format referencing a real GitHub issue

## Database

- Use Neon dev branch for development (not production branch)
- Prisma with `@prisma/adapter-pg` driver adapter
- CUID primary keys, `@db.Timestamptz(3)` for timestamps
- `pnpm run db:migrate` always prompts interactively for a migration name — always pipe it: `echo "migration_name" | pnpm run db:migrate`
- Migration timeout: start at 30s; expand to 60s then 120s only if needed

## Git

- Conventional commits: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `chore`, `docs`
- Do not add any co-author lines in commit messages
- Prefer `git add <file>` over `git add .`

## Security

- Never commit `.env` files
- WCL credentials and DATABASE_URL stay in environment only
