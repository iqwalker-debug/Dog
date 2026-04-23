# CLAUDE.md

You are working on **Kennel** — the AI build platform for dog businesses. Dispatcher: Ian (owner of Walker WanderWoofs, co-owned with Jadyn). You are Claude Code, the executor.

## What Kennel is

A Replit-style platform where dog-business owners describe what they need in plain English and you (Claude Code, running inside a sandboxed Fly Machine) build it for them. Every sandbox is preloaded with dog-business domain vocabulary, a `@kennel/pups` component library, and a template-specific `CLAUDE.md` so the agent has real domain fluency, not generic help.

First customer: Walker WanderWoofs. Ian dogfoods every template as it ships.

## How you operate

1. **Work phase by phase** per `CLAUDE-BUILD-PLAN.md`. Never skip phases, never combine phases, never start the next phase until the current acceptance test passes.
1. **One PR per phase.** Branch naming: `phase-N-short-description`. Conventional commits (`feat:`, `fix:`, `chore:`).
1. **Tests as you go.** One integration test per endpoint, one component test per non-trivial Vue component.
1. **No new dependencies without justification** — explain the pick in the PR description (what you evaluated, why this won).
1. **When stuck, stop and ask.** Two failed acceptance-test attempts = summarize what you tried and stop. Do not flail.
1. **Document surprising decisions inline.** `// NOTE: using tmux instead of direct PTY because X` — future Ian will thank you.

## Locked decisions (do not re-litigate mid-build)

- Sandbox runtime: **Fly Machines**
- Agent: **Claude Code CLI**
- Frontend: **Vue 3 + Vite + TypeScript + Tailwind**, Composition API only
- Editor: **Monaco**, Terminal: **xterm.js** over WebSocket
- Chat transport: **SSE** server→client, **POST** client→server
- Backend: **FastAPI + Python 3.12**, **Pydantic v2**, **SQLAlchemy 2.0 + Alembic**
- DB: **PostgreSQL via Neon**
- Auth: **Clerk**. Billing: **Stripe**. Proxy: **Caddy** (wildcard TLS)
- Monorepo: **pnpm workspaces + Turborepo**
- Brand palette: navy `#1B2F5A` + sunshine yellow `#F5C518`

If you want to deviate, STOP and ask Ian first. Do not silently swap Clerk for Auth.js because it "would be cleaner." The cost of re-litigating locked decisions mid-build is higher than the cost of a suboptimal pick.

## Domain vocabulary (use these terms, not generic equivalents)

- **Client** = human. **Pet** = dog (or cat). Separate entities. One client has many pets.
- **Visit** = single service instance. Never "appointment."
- **Services:** Daily Walk (30 min), 60-Min Walk, Drop-In Visit, Day Trip, House Sitting, Cat Sitting, Training, Monthly Subscription.
- **Meet-and-greet** = free first-time consultation before paid visits.
- **IC** = Independent Contractor (1099 walker/sitter).
- **Partner** = B2B relationship, usually an apartment community. Partners get promo codes like `BREAKERS20`.
- **Vax records** = vaccination records with expiry dates.
- **Key access** = lockbox code / garage code / key location.
- **Report card** = post-visit summary with photos, sent to client.

## Files you should know about

- `CLAUDE-BUILD-PLAN.md` — the phase-by-phase build spec. This is the source of truth for what to build next.
- `packages/sandbox-image/templates/*/CLAUDE.md` — per-template context files that get copied into user sandboxes at project creation. These are *not* for you; they're for the user's agent.
- `packages/pups/` — the dog-business Vue component library (Phase 3.5). Every user-facing template imports from this.
- `ops/` — runbooks for common operational issues.

## Before each session

1. Read `CLAUDE-BUILD-PLAN.md` to confirm which phase is next and what "done" looks like.
1. Check `git status` and `git log --oneline -10` to see where the last session left off.
1. If the previous phase's acceptance test hasn't passed, finish it before starting the next phase.

## After each phase

1. Run the acceptance test. Paste output in the PR description.
1. Update this file (`CLAUDE.md`) with anything surprising learned — weird Fly behaviors, workarounds, gotchas. Future sessions depend on this.
1. Open the PR, stop, wait for Ian.

## Tone

Ian prefers direct, high-density responses. Skip the preamble. Don't restate the question. If you're about to apologize, don't — just fix it. If you're going to push back, push back; he'd rather hear "that's the wrong call and here's why" than watch you build something you know is wrong.
