"""Test fixtures.

If `TEST_DATABASE_URL` is set, use it directly (useful when Docker isn't available).
Otherwise start a throwaway `postgres:16-alpine` via testcontainers-python.
"""
from __future__ import annotations

import os
import subprocess
from collections.abc import AsyncIterator, Iterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from kennel_api.main import create_app


def _normalize_asyncpg_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url[len("postgresql://") :]
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url[len("postgres://") :]
    return url


@pytest.fixture(scope="session")
def database_url() -> Iterator[str]:
    env_url = os.environ.get("TEST_DATABASE_URL")
    if env_url:
        yield _normalize_asyncpg_url(env_url)
        return

    from testcontainers.postgres import PostgresContainer

    with PostgresContainer("postgres:16-alpine") as pg:
        yield _normalize_asyncpg_url(pg.get_connection_url())


@pytest.fixture(scope="session", autouse=True)
def _apply_migrations(database_url: str) -> None:
    env = {**os.environ, "DATABASE_URL": database_url}
    subprocess.run(
        ["uv", "run", "alembic", "upgrade", "head"],
        check=True,
        env=env,
        cwd=os.path.dirname(os.path.dirname(__file__)),
    )


@pytest_asyncio.fixture
async def client(database_url: str, monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[AsyncClient]:
    monkeypatch.setenv("DATABASE_URL", database_url)
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        async with app.router.lifespan_context(app):
            yield c
