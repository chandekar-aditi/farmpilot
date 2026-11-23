from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache

# Always resolve .env relative to this file's location (backend/core/../.env)
# This works regardless of which directory uvicorn is started from
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    SECRET_KEY: str = "change_this_secret_min_32_chars_long"
    GROQ_API_KEY: str = ""
    DATABASE_URL: str = "mysql+pymysql://root:root@localhost:3306/farmpilot"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    class Config:
        env_file = str(ENV_PATH)
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
