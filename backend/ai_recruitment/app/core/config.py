from __future__ import annotations

from functools import lru_cache
import json

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "AI Recruitment Intelligence System"
    api_prefix: str = "/api/v1"

    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_chat_model: str = Field(default="gpt-4o", alias="OPENAI_CHAT_MODEL")
    supabase_url: str = Field(default="", alias="SUPABASE_URL")
    supabase_service_role_key: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")
    embedding_model: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2",
        validation_alias=AliasChoices("EMBEDDING_MODEL", "OPENAI_EMBEDDING_MODEL"),
    )

    chunk_size: int = Field(default=900, alias="CHUNK_SIZE")
    chunk_overlap: int = Field(default=120, alias="CHUNK_OVERLAP")
    rag_top_k: int = Field(default=5, alias="RAG_TOP_K")
    match_retrieval_k: int = Field(default=50, alias="MATCH_RETRIEVAL_K")

    cors_allow_origins: list[str] = Field(default_factory=lambda: ["*"])

    @field_validator("cors_allow_origins", mode="before")
    @classmethod
    def parse_cors_allow_origins(cls, value: str | list[str]) -> list[str]:
        """Accept JSON arrays or comma-separated CORS origins."""
        if isinstance(value, list):
            return value

        if isinstance(value, str):
            normalized = value.strip()
            if not normalized:
                return ["*"]
            if normalized.startswith("["):
                parsed = json.loads(normalized)
                return parsed if isinstance(parsed, list) else ["*"]
            return [item.strip() for item in normalized.split(",") if item.strip()]

        return ["*"]

    def validate_runtime_dependencies(self) -> None:
        """Validate runtime-only settings required to access Supabase."""
        missing: list[str] = []
        if not self.supabase_url.strip():
            missing.append("SUPABASE_URL")
        if not self.supabase_service_role_key.strip():
            missing.append("SUPABASE_SERVICE_ROLE_KEY")

        if missing:
            joined = ", ".join(missing)
            raise RuntimeError(f"Missing required runtime environment variables: {joined}")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
