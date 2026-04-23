from contextlib import asynccontextmanager

from fastapi import FastAPI

from kennel_api.config import get_settings
from kennel_api.db import make_engine, make_sessionmaker
from kennel_api.routes import health


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    engine = make_engine(settings)
    app.state.engine = engine
    app.state.sessionmaker = make_sessionmaker(engine)
    try:
        yield
    finally:
        await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(title="kennel-api", lifespan=lifespan)
    app.include_router(health.router)
    return app


app = create_app()
