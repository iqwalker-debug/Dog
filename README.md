# Refuge Community Church — PWA

Phase 1 of the Refuge PWA. Public sermons, events, location, live-stream banner.
See [`refuge-pwa-spec.md`](./refuge-pwa-spec.md) for the full multi-phase spec.

## Stack

- Vite + React 18 + TypeScript, Tailwind v4, shadcn-style UI
- Wouter routing, TanStack Query data layer
- Cloudflare Workers + Hono, D1, R2
- Drizzle ORM + drizzle-kit migrations

## Layout

```
src/
  client/          React SPA (pages, components, hooks)
  worker/          Hono worker (routes in routes/)
  db/              Drizzle schema + migrations + seed
  shared/          Types shared by client and worker
public/            Static assets (manifest, sw.js, offline.html, icons)
```

## First-time setup

```bash
pnpm install
npx wrangler login

# Cloudflare resources
npx wrangler d1 create refuge-pwa-db
# → copy the printed database_id into wrangler.toml
npx wrangler r2 bucket create refuge-pwa-media

# Apply initial migration
pnpm db:migrate:local     # local D1
pnpm db:migrate           # remote D1

# Optional: load dev seed data
npx wrangler d1 execute refuge-pwa-db --local --file=src/db/seed.sql
```

## Develop

```bash
pnpm dev        # Vite + worker via @cloudflare/vite-plugin
pnpm typecheck
pnpm build      # outputs dist/client + bundles worker
pnpm deploy     # vite build && wrangler deploy
```

## What's here (Phase 1)

### D1 tables
`service_info`, `sermons`, `events`, `live_stream_config`, `donations`
(see `src/db/schema.ts` and `src/db/migrations/0000_initial.sql`).

### API routes
- `GET /api/config` — service info + live-stream state
- `GET /api/sermons?series=&speaker=&cursor=` — published feed, paginated
- `GET /api/sermons/:id`
- `GET /api/events` — upcoming published
- `GET /api/events/:id`
- `GET /api/health`
- `POST /api/give/*` — **stub** (501); see Stripe plan below

All responses use `{ data, error }` shape from `src/shared/types.ts`.

### Client pages
`Home` · `Sermons` · `SermonDetail` · `Events` · `EventDetail` · `About` · `Give` (placeholder)

### PWA
`public/manifest.webmanifest`, `public/sw.js` (cache-first shell, network-first
API with 24h fallback, SWR for images), `public/offline.html`.
Add real PNG icons to `public/icons/` before shipping.

## Theme

Tokens live in `src/client/index.css` under `@theme`. Swap `--color-brand-*`
and `--color-cream-*` to re-skin the app — nothing else needs to change.

## Next: Stripe (Phase 1.5)

Not yet implemented. See the build session for the integration plan that
follows this phase.
