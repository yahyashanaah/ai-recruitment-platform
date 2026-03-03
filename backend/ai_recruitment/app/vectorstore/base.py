from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from langchain_core.documents import Document


class BaseVectorStore(ABC):
    """Abstract vector store contract for pluggable retrieval backends."""

    @abstractmethod
    def add_documents(self, documents: list[Document]) -> None:
        """Add chunked documents to the vector store."""

    @abstractmethod
    def similarity_search(
        self,
        query: str,
        k: int = 5,
        metadata_filter: dict[str, Any] | None = None,
    ) -> list[Document]:
        """Perform similarity search and return matching documents."""

    @abstractmethod
    def delete_candidate(self, candidate_id: str) -> int:
        """Delete all vectors for one candidate and return removed vector count."""

    @abstractmethod
    def get_all_candidates(self) -> list[dict[str, str]]:
        """Return unique candidates represented in the vector store."""
