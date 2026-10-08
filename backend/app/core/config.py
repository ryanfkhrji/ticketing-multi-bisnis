# Ini setara process.env yang sudah bertipe. Pydantic otomatis mencocokkan DATABASE_URL di .env dengan database_url, dan error kalau ada yang hilang.

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()