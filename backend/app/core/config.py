# Ini setara process.env yang sudah bertipe. Pydantic otomatis mencocokkan DATABASE_URL di .env dengan database_url, dan error kalau ada yang hilang.

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 1
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    model_config = SettingsConfigDict(env_file=".env")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

settings = Settings()