# kennel-api

FastAPI backend for Kennel. Python 3.12, async SQLAlchemy 2.0, Alembic, Postgres (Neon in prod).

## Setup

```
uv sync
cp .env.example .env   # fill in DATABASE_URL
```

## Run

```
pnpm --filter api dev          # uvicorn on :8000 with --reload
curl localhost:8000/healthz    # {"status":"ok","db":"ok"}
```

## Tests

```
pnpm --filter api test
```

By default the test suite starts a throwaway `postgres:16-alpine` via
testcontainers-python (requires a running Docker daemon). If Docker isn't
available, set `TEST_DATABASE_URL` to any reachable Postgres and the suite
will use it directly:

```
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/kennel_test \
  pnpm --filter api test
```

## Migrations

```
pnpm --filter api migrate      # alembic upgrade head
uv run alembic revision -m "add clients table"
```

`migrations/env.py` uses the async SQLAlchemy Alembic recipe and reads
`DATABASE_URL` through `kennel_api.config.Settings`, so the same env var
drives both runtime and migrations.
