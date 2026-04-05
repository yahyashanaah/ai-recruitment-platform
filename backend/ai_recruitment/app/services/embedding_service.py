from __future__ import annotations

import asyncio

class EmbeddingService:
    """Sentence-transformers embedding service for pgvector storage."""

    def __init__(self, model_name: str) -> None:
        from sentence_transformers import SentenceTransformer

        self._model = SentenceTransformer(model_name)

    def embed_query(self, text: str) -> list[float]:
        return self.embed_documents([text])[0]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        vectors = self._model.encode(
            texts,
            normalize_embeddings=True,
            convert_to_numpy=True,
        )
        return [vector.tolist() for vector in vectors]

    async def embed_query_async(self, text: str) -> list[float]:
        return await asyncio.to_thread(self.embed_query, text)

    async def embed_documents_async(self, texts: list[str]) -> list[list[float]]:
        return await asyncio.to_thread(self.embed_documents, texts)
