from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    secret_key: str = "dev-secret-key-change-in-production"
    access_token_expire_minutes: int = 10080  # 7 days
    algorithm: str = "HS256"

    gemini_api_key: str = ""
    groq_api_key: str = ""
    rapidapi_key: str = ""

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    frontend_url: str = "http://localhost:3000"
    # Public API URL (no trailing slash). Used for Google OAuth redirect URI.
    backend_url: str = "http://localhost:8000"

    database_url: str = "sqlite+aiosqlite:///./internship_intelligence.db"

    allowed_origins: str = "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003"

    # SMTP / email settings (leave smtp_user empty to use dev/print mode)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
