# Kennel Build Plan

Phase-by-phase spec. One PR per phase. Don't start phase N+1 until phase N's acceptance test passes.

Each phase lists: **Goal**, **Scope** (what's in), **Out of scope** (what's explicitly deferred), **Acceptance test** (the single check that says "done").

---

## Phase 0 — Monorepo scaffold

**Goal:** Empty but valid pnpm + Turborepo monorepo. Nothing builds yet because nothing's been written, but the plumbing works.

**Scope:**
- `CLAUDE.md` (committed).
- `CLAUDE-BUILD-PLAN.md` (this file).
- Root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.nvmrc`.
- Empty `apps/`, `packages/`, `ops/` with `.gitkeep`.
- `README.md` points to `CLAUDE.md`.

**Out of scope:** any app code, any package code, CI.

**Acceptance test:**
```
pnpm install && pnpm turbo run build --dry=json | jq '.tasks | length' # -> 0 (no tasks yet, but no errors)
```

---

## Phase 1 — Backend skeleton (FastAPI + Neon + Alembic)

**Goal:** `apps/api` boots, connects to Neon, serves `GET /healthz` returning `{status:"ok", db:"ok"}`.

**Scope:**
- `apps/api/` with `pyproject.toml` (uv or poetry — pick one in PR).
- FastAPI app with `/healthz`.
- SQLAlchemy 2.0 async engine bound to `DATABASE_URL` (Neon).
- Alembic configured; one empty initial migration.
- `.env.example` documenting required vars.
- One pytest integration test hitting `/healthz` against a test DB.

**Acceptance test:** `pnpm --filter api test` green; `curl localhost:8000/healthz` returns `db:"ok"` against a Neon branch.

---

## Phase 2 — Frontend shell (Vue 3 + Vite + Tailwind + brand palette)

**Goal:** `apps/web` boots, shows a splash page styled with brand palette. No auth yet.

**Scope:**
- `apps/web/` Vite + Vue 3 + TS + Tailwind.
- Tailwind config with `kennel-navy` (`#1B2F5A`) and `kennel-sun` (`#F5C518`).
- Landing page with logo placeholder, tagline, "Sign in" button (stub).
- Vitest configured; one smoke test renders App.vue.

**Acceptance test:** `pnpm --filter web build` green; `pnpm --filter web dev` serves a page with both brand colors visible.

---

## Phase 3 — Auth (Clerk end-to-end)

**Goal:** User signs in via Clerk, backend validates JWT, DB has a `users` row.

**Scope:**
- Clerk on frontend (sign-in/sign-up).
- Backend middleware: verify Clerk JWT, inject `request.state.user`.
- `users` table (id, clerk_id, email, created_at); on-first-login upsert.
- `GET /me` returns current user.

**Acceptance test:** Fresh sign-up creates exactly one row; `GET /me` returns it; unauthenticated request to `/me` returns 401.

---

## Phase 3.5 — `@kennel/pups` component library

**Goal:** Shared Vue component library with dog-business primitives, used by web app and every template.

**Scope:**
- `packages/pups/` — Vue 3 + TS, published via workspace protocol.
- Initial components: `<PupButton>`, `<PupCard>`, `<ClientCard>`, `<PetCard>`, `<VisitBadge>`, `<VaxStatus>`.
- Histoire or Storybook for visual docs (pick in PR).
- Component tests (Vitest + @vue/test-utils).

**Acceptance test:** `apps/web` imports `<ClientCard>` and renders a seed client; all component tests green.

---

## Phase 4 — Project creation → Fly Machine spawn

**Goal:** Authed user clicks "New project", picks a template, backend spawns a Fly Machine running `packages/sandbox-image`, returns a machine ID + private URL.

**Scope:**
- `packages/sandbox-image/` — Dockerfile with Node, Python, git, Claude Code CLI, tmux, a project template tree.
- Fly app + token config (scoped to one org).
- `projects` table: id, user_id, template, fly_machine_id, created_at.
- `POST /projects` → spawn machine, persist row.
- One template ships: `walker-wanderwoofs-starter` (empty Vue+FastAPI stub with pups preinstalled + per-template `CLAUDE.md`).

**Out of scope:** terminal, editor, chat. Just spawn + record.

**Acceptance test:** `POST /projects` returns a machine reachable at `https://<id>.internal:8080/healthz`.

---

## Phase 5 — Terminal (xterm.js over WebSocket)

**Goal:** Browser terminal attached to a tmux session inside the user's Fly Machine.

**Scope:**
- `/ws/terminal/:project_id` WebSocket endpoint, proxies to Fly Machine tmux via `fly ssh`/PTY.
- xterm.js frontend with resize handling.
- Session resumes on reconnect (tmux attach).

**Acceptance test:** User runs `ls` in the browser terminal, sees the sandbox filesystem; disconnect + reconnect shows same tmux scrollback.

---

## Phase 6 — Monaco editor + file tree

**Goal:** Read + edit + save files in the sandbox from the browser.

**Scope:**
- `/files/:project_id?path=` REST endpoints (list, read, write).
- Monaco editor component with TS/Python/Vue language support.
- File tree pane.
- Optimistic save + conflict detection (mtime check).

**Acceptance test:** Edit `README.md` in browser, `cat README.md` in terminal shows the change.

---

## Phase 7 — Chat (SSE + Claude Code CLI bridge)

**Goal:** User chats with Claude Code CLI inside the sandbox from the web UI.

**Scope:**
- `POST /chat/:project_id` (user message) + `GET /chat/:project_id/stream` (SSE from agent).
- Inside sandbox: Claude Code CLI runs under tmux, output tail'd to SSE.
- Message history persisted in Postgres.
- Chat pane in web UI, SSE consumer.

**Acceptance test:** User types "add a hello.txt", Claude Code creates the file, file tree reflects it without manual refresh.

---

## Phase 8 — Preview URLs (Caddy + wildcard TLS)

**Goal:** Every project gets a public `https://<slug>.kennel.build` preview.

**Scope:**
- Caddy as edge proxy with DNS-01 wildcard (Cloudflare or Route53).
- Slug-based routing to Fly Machine private IP.
- "Open preview" button in UI.

**Acceptance test:** Sandbox dev server on port 5173 is reachable at `https://<slug>.kennel.build`, TLS valid.

---

## Phase 9 — Template system

**Goal:** Multiple templates, each with its own preloaded `CLAUDE.md` and pups preinstalled.

**Scope:**
- `packages/sandbox-image/templates/` — one dir per template.
- Templates: `walker-wanderwoofs-starter`, `booking-only`, `client-portal`.
- Each has a template-specific `CLAUDE.md` with domain-relevant guidance.
- Template picker in project-creation UI.

**Acceptance test:** Creating a `booking-only` project yields a sandbox whose `CLAUDE.md` contains booking-specific vocabulary and whose `package.json` has `@kennel/pups` installed.

---

## Phase 10 — Billing (Stripe)

**Goal:** Metered billing on active sandbox minutes; Stripe customer per user.

**Scope:**
- Stripe customer + subscription on first project.
- Usage reporting: Fly Machine runtime → Stripe usage records.
- Billing page in UI (current period, invoices).
- Webhook handler for invoice events.

**Acceptance test:** Run a sandbox for 10 min, Stripe dashboard shows 10 min of usage on the test customer.

---

## Phase 11 — Production hardening

**Goal:** Observable, rate-limited, backed up.

**Scope:**
- Structured logs (JSON) → log sink (pick: Axiom, Logtail, or Loki — decide in PR).
- Sentry on frontend + backend.
- Rate limits on `/projects`, `/chat`.
- Neon branch backups verified.
- Runbooks in `ops/` for: sandbox won't spawn, chat stuck, billing mismatch.

**Acceptance test:** Force a 5xx in staging, verify Sentry event fires and log sink shows the request.

---

## Phase 12 — Walker WanderWoofs dogfood

**Goal:** Ian builds the real Walker WanderWoofs site on Kennel end-to-end, no manual intervention.

**Scope:**
- Start from `walker-wanderwoofs-starter`.
- Drive the build via chat only.
- File any gotchas back into `ops/` and template `CLAUDE.md`.

**Acceptance test:** `walkerwanderwoofs.com` is served from a Kennel project, with real clients booking real visits.
