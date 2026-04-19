# Refuge Community Church PWA — Build Spec

A Progressive Web App for Refuge Community Church. Installable on iOS/Android from the browser (no app store), works offline for cached content, supports push notifications for members.

---

## Stack

| Layer        | Choice                       | Notes                          |
| ------------ | ---------------------------- | ------------------------------ |
| Frontend     | Vite + React 18 + TypeScript | SPA with service worker        |
| Styling      | Tailwind CSS v4 + shadcn/ui  | Matches WWW stack              |
| Routing      | Wouter                       | Lightweight, not React Router  |
| Data         | TanStack Query               | Cache + optimistic updates     |
| Auth         | Clerk                        | Full accounts, email + social  |
| Backend      | Cloudflare Workers + Hono    | Typed, clean routing           |
| Database     | Cloudflare D1                | SQLite at edge, 5GB free       |
| ORM          | Drizzle                      | Migrations via drizzle-kit     |
| File storage | Cloudflare R2                | Sermon audio, images           |
| Video        | Cloudflare Stream            | Sermons + live stream          |
| Payments     | Stripe                       | Payment Intents + Checkout     |
| Push         | Web Push API                 | VAPID, subs in D1              |
| Deploy       | Cloudflare Pages             | GitHub auto-deploy             |

Explicitly excluded: Next.js, Prisma, React Router.

---

## Phase 1 — Public MVP (build first, ~1 week)

No auth required to browse. Launchable on its own.

- Home: next service time, featured sermon, Give CTA, live-stream banner when active
- Sermons: list + detail with audio/video player, filter by series/speaker
- Events: upcoming list + detail, "add to calendar" link
- About / Location: service times, address, map link, contact
- Give: Stripe Checkout (one-time or recurring), no login required
- PWA: installable, service worker, offline fallback, app icon

## Phase 2 — Community (~1 week)

- Clerk auth wired up
- Prayer requests: submit, browse public wall, admin moderation queue
- Small groups: directory, leader contact, signup flow
- Push notifications: opt-in, admin can broadcast or segment

## Phase 3 — Fundraisers + Admin (~1 week)

- Fundraisers: GoFundMe-style cards with progress bars, multiple concurrent campaigns, one-time or recurring contribution
- Donor dashboard: giving history, tax receipts, manage recurring
- Admin routes (Clerk role-gated): post sermons, create events, launch fundraisers, send push, moderate prayers — replaces direct D1 editing

---

## D1 Schema — Phase 1

```sql
-- Singleton: always id = 1
CREATE TABLE service_info (
  id INTEGER PRIMARY KEY DEFAULT 1,
  service_times TEXT NOT NULL,  -- JSON: [{ day, time, name }]
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  map_url TEXT,
  phone TEXT,
  email TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE sermons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  speaker TEXT NOT NULL,
  series TEXT,
  description TEXT,
  scripture TEXT,
  preached_on INTEGER NOT NULL,
  audio_url TEXT,            -- R2 public URL
  video_uid TEXT,            -- Cloudflare Stream UID
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  published INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_sermons_feed ON sermons(published, preached_on DESC);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  location TEXT,
  address TEXT,
  image_url TEXT,
  cta_label TEXT,            -- e.g. "RSVP"
  cta_url TEXT,
  published INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_events_upcoming ON events(published, starts_at);

CREATE TABLE live_stream_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  is_live INTEGER NOT NULL DEFAULT 0,
  embed_url TEXT,
  title TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE donations (
  id TEXT PRIMARY KEY,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  donor_email TEXT,
  donor_name TEXT,
  fund TEXT,                 -- "general", "missions", etc.
  fundraiser_id TEXT,        -- null for general giving
  is_recurring INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,      -- "succeeded", "failed", "pending"
  created_at INTEGER NOT NULL
);
```

---

## Worker API Routes (Phase 1 only)

```
GET  /api/config                      → service_info + live_stream_config
GET  /api/sermons?series=&speaker=    → paginated list (published only)
GET  /api/sermons/:id
GET  /api/events                      → upcoming published
GET  /api/events/:id
POST /api/give/checkout               → creates Stripe Checkout session (Phase 1.5)
POST /api/give/webhook                → Stripe → D1 donations    (Phase 1.5)
```

Response shape throughout:

```ts
type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string } };
```

---

## Theme

- Primary: Navy `#1B2F5A`
- Background: Warm cream `#FAF7F0`
- Tokens expressed as CSS custom properties so they can be swapped later.
