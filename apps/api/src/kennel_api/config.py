from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = Field(alias="DATABASE_URL")
    app_env: str = Field(default="development", alias="APP_ENV")

    @field_validator("database_url", mode="after")
    @classmethod
    def _force_asyncpg(cls, v: str) -> str:
        # Neon hands out postgres:// and postgresql:// — asyncpg needs postgresql+asyncpg://
        if v.startswith("postgres://"):
            return "postgresql+asyncpg://" + v[len("postgres://") :]
        if v.startswith("postgresql://"):
            return "postgresql+asyncpg://" + v[len("postgresql://") :]
        return v


def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
