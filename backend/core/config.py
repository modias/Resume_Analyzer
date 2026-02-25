import os
from functools import lru_cache


class Settings:
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    max_pdf_size_mb: int = int(os.getenv("MAX_PDF_SIZE_MB", "5"))

    @property
    def openai_enabled(self) -> bool:
        return bool(self.openai_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
