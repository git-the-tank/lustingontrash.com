# @lot/web

Static landing page and guild SPA for Lusting on Trash.

## Stack

- React 19, Vite 8, Tailwind CSS v4, TypeScript

## Structure

- `index.html` — Landing page entry point (static)
- `app/index.html` — SPA entry point
- `src/` — Source code
    - `main.tsx` — React SPA entry (BrowserRouter with basename `/app`)
    - `App.tsx` — Route definitions with auth guards
    - `auth/` — Auth context, guard, and types (Battle.net OAuth)
    - `components/` — Shared UI components
    - `pages/` — Page components (Players, Login, AccessDenied)
    - `hooks/` — Custom hooks (`useApi`)
    - `lib/` — Utilities (`api.ts` with `fetchApi` and auth token management)
    - `landing/` — Landing page JS/CSS entry
    - `index.css` — Tailwind import
- `public/` — Static assets (class/role icons, `_redirects` for Cloudflare Pages)

## Code Conventions

- Desktop-only styling
- Explicit `isLoading` state (no Suspense for data)
- Local state preferred (`useState`/`useReducer`)
- Plain `fetch` for API calls (no GraphQL client on frontend)
- `PascalCase.tsx` for components, `camelCase.ts` for utilities
- No `any` types

## Key Scripts

```
pnpm run dev        # vite dev server (port 3000, proxies /api → 4000)
pnpm run build      # vite build → dist/
pnpm run typecheck  # tsc --noEmit
```

## Environment

- `VITE_API_URL` — API base URL (build-time, falls back to `/api` for dev proxy)

## Deployment

Cloudflare Pages. Build: `pnpm run build`. Output: `dist/`.
