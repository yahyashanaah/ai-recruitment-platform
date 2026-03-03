from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

from langchain_core.documents import Document
from langchain_openai import ChatOpenAI

from app.prompts.rag_prompt import build_rag_prompt


class RAGService:
    """Retrieval-Augmented Generation service with streaming output."""

    NOT_FOUND_MESSAGE = "Not found in uploaded documents."

    def __init__(
        self,
        chat_model: ChatOpenAI,
        vector_store,
        default_top_k: int = 5,
    ) -> None:
        self._chat_model = chat_model
        self._vector_store = vector_store
        self._default_top_k = default_top_k

    async def stream_answer(
        self,
        question: str,
        top_k: int | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        retrieval_k = top_k or self._default_top_k
        documents = self._vector_store.similarity_search(
            query=question,
            k=retrieval_k,
        )

        if not documents:
            yield {"event": "token", "data": {"text": self.NOT_FOUND_MESSAGE}}
            yield {"event": "sources", "data": {"sources": []}}
            yield {"event": "done", "data": {"status": "completed"}}
            return

        prompt = build_rag_prompt(context=self._build_context(documents), question=question)
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

        yield {"event": "sources", "data": {"sources": self._extract_sources(documents)}}
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
    def _build_context(documents: list[Document]) -> str:
        lines: list[str] = []
        for index, document in enumerate(documents, start=1):
            metadata = document.metadata or {}
            lines.append(
                (
                    f"[{index}] candidate_name={metadata.get('candidate_name', 'Unknown')} | "
                    f"file_name={metadata.get('file_name', '')} | "
                    f"page_number={metadata.get('page_number', 'N/A')}\n"
                    f"{document.page_content.strip()}"
                )
            )
        return "\n\n".join(lines)

    @staticmethod
    def _extract_sources(documents: list[Document]) -> list[dict[str, Any]]:
        seen: set[tuple[str, str, int]] = set()
        sources: list[dict[str, Any]] = []

        for document in documents:
            metadata = document.metadata or {}
            source = (
                str(metadata.get("candidate_name", "Unknown")),
                str(metadata.get("file_name", "")),
                int(metadata.get("page_number", 1)),
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
