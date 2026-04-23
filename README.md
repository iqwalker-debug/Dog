# Kennel

AI build platform for dog businesses.

See [`CLAUDE.md`](./CLAUDE.md) for how the project operates and
[`CLAUDE-BUILD-PLAN.md`](./CLAUDE-BUILD-PLAN.md) for the phased build spec.

## Layout

```
apps/       # user-facing apps (web, api)
packages/   # shared libraries (pups, sandbox-image, ...)
ops/        # runbooks
```

## Getting started

```
pnpm install
pnpm turbo run build
```

Requires Node 22 and pnpm 10.
