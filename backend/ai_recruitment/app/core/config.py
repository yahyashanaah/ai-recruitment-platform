from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
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
    embedding_model: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2",
        validation_alias=AliasChoices("EMBEDDING_MODEL", "OPENAI_EMBEDDING_MODEL"),
    )

    sqlite_url: str = Field(
        default="sqlite:///./data/candidates.db",
        validation_alias=AliasChoices("SQLITE_URL", "DATABASE_URL"),
    )
    faiss_index_path: str = Field(default="./data/faiss_index", alias="FAISS_INDEX_PATH")

    chunk_size: int = Field(default=900, alias="CHUNK_SIZE")
    chunk_overlap: int = Field(default=120, alias="CHUNK_OVERLAP")
    rag_top_k: int = Field(default=5, alias="RAG_TOP_K")
    match_retrieval_k: int = Field(default=50, alias="MATCH_RETRIEVAL_K")

    cors_allow_origins: list[str] = Field(default_factory=lambda: ["*"])

    def ensure_directories(self) -> None:
        """Create local directories required by SQLite and FAISS persistence."""
        if self.sqlite_url.startswith("sqlite:///"):
            sqlite_path = Path(self.sqlite_url.replace("sqlite:///", "", 1)).resolve()
            sqlite_path.parent.mkdir(parents=True, exist_ok=True)

        Path(self.faiss_index_path).resolve().mkdir(parents=True, exist_ok=True)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
