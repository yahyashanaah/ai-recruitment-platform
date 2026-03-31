from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

from langchain_openai import ChatOpenAI

from app.auth.service import AuthenticatedRecruiter
from app.prompts.rag_prompt import build_rag_prompt
from app.repositories.chunks import ChunkRepository
from app.services.embedding_service import EmbeddingService


class RAGService:
    """Retrieval-Augmented Generation service backed by Supabase pgvector."""

    NOT_FOUND_MESSAGE = "Not found in uploaded documents."

    def __init__(
        self,
        chat_model: ChatOpenAI,
        chunk_repository: ChunkRepository,
        embedding_service: EmbeddingService,
        default_top_k: int = 5,
    ) -> None:
        self._chat_model = chat_model
        self._chunk_repository = chunk_repository
        self._embedding_service = embedding_service
        self._default_top_k = default_top_k

    async def stream_answer(
        self,
        recruiter: AuthenticatedRecruiter,
        question: str,
        top_k: int | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        retrieval_k = top_k or self._default_top_k
        matches = self._chunk_repository.search_chunks(
            access_token=recruiter.access_token,
            recruiter_id=recruiter.id,
            query_embedding=self._embedding_service.embed_query(question),
            limit=retrieval_k,
        )

        if not matches:
            yield {"event": "token", "data": {"text": self.NOT_FOUND_MESSAGE}}
            yield {"event": "sources", "data": {"sources": []}}
            yield {"event": "done", "data": {"status": "completed"}}
            return

        prompt = build_rag_prompt(context=self._build_context(matches), question=question)
        answer_fragments: list[str] = []
        async for chunk in self._chat_model.astream(prompt):
            content = self._extract_chunk_text(chunk.content)
            if not content:
                continue
            answer_fragments.append(content)
            yield {"event": "token", "data": {"text": content}}

        final_answer = "".join(answer_fragments).strip()
        if not final_answer:
            yield {"event": "token", "data": {"text": self.NOT_FOUND_MESSAGE}}

        yield {"event": "sources", "data": {"sources": self._extract_sources(matches)}}
        yield {"event": "done", "data": {"status": "completed"}}

    @staticmethod
    def _extract_chunk_text(content: Any) -> str:
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts: list[str] = []
            for item in content:
                if isinstance(item, str):
                    parts.append(item)
                elif isinstance(item, dict):
                    text = item.get("text")
                    if isinstance(text, str):
                        parts.append(text)
            return "".join(parts)
        return ""

    @staticmethod
    def _build_context(matches: list[dict[str, Any]]) -> str:
        lines: list[str] = []
        for index, match in enumerate(matches, start=1):
            lines.append(
                (
                    f"[{index}] candidate_name={match.get('candidate_name', 'Unknown')} | "
                    f"file_name={match.get('file_name', '')} | "
                    f"page_number={match.get('page_number', 1)}\n"
                    f"{str(match.get('content') or '').strip()}"
                )
            )
        return "\n\n".join(lines)

    @staticmethod
    def _extract_sources(matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
        seen: set[tuple[str, str, int]] = set()
        sources: list[dict[str, Any]] = []

        for match in matches:
            source = (
                str(match.get("candidate_name") or "Unknown"),
                str(match.get("file_name") or ""),
                int(match.get("page_number") or 1),
            )
            if source in seen:
                continue
            seen.add(source)
            sources.append(
                {
                    "candidate_name": source[0],
                    "file_name": source[1],
                    "page_number": source[2],
                }
            )

        return sources

