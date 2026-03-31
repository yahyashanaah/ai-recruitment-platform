from __future__ import annotations

from uuid import uuid4

from fastapi import HTTPException, status

from app.auth.service import AuthenticatedRecruiter
from app.models.schemas import (
    CandidateChunkCreateRequest,
    CandidateChunkResponse,
    CandidateChunkSearchRequest,
    CandidateChunkSearchResult,
    CandidateChunkUpdateRequest,
)
from app.repositories.chunks import ChunkRepository
from app.services.embedding_service import EmbeddingService


class ChunkService:
    """Chunk CRUD and semantic search operations backed by pgvector."""

    def __init__(
        self,
        chunk_repository: ChunkRepository,
        embedding_service: EmbeddingService,
    ) -> None:
        self._chunk_repository = chunk_repository
        self._embedding_service = embedding_service

    def list_chunks(
        self,
        recruiter: AuthenticatedRecruiter,
        *,
        candidate_id: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[CandidateChunkResponse], int]:
        rows, total = self._chunk_repository.list_chunks(
            access_token=recruiter.access_token,
            recruiter_id=recruiter.id,
            candidate_id=candidate_id,
            limit=limit,
            offset=offset,
        )
        return [CandidateChunkResponse.from_record(row) for row in rows], total

    def get_chunk(
        self,
        recruiter: AuthenticatedRecruiter,
        chunk_id: str,
    ) -> CandidateChunkResponse:
        record = self._chunk_repository.get_chunk(
            access_token=recruiter.access_token,
            recruiter_id=recruiter.id,
            chunk_id=chunk_id,
        )
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chunk not found.")
        return CandidateChunkResponse.from_record(record)

    def create_chunk(
        self,
        recruiter: AuthenticatedRecruiter,
        payload: CandidateChunkCreateRequest,
    ) -> CandidateChunkResponse:
        embedding = self._embedding_service.embed_query(payload.content)
        record = self._chunk_repository.create_chunk(
            access_token=recruiter.access_token,
            recruiter_id=recruiter.id,
            payload={
                "id": str(uuid4()),
                "candidate_id": payload.candidate_id,
                "recruiter_id": recruiter.id,
                "content": payload.content,
                "embedding": embedding,
                "page_number": payload.page_number,
                "file_name": payload.file_name,
            },
        )
        return CandidateChunkResponse.from_record(record)

    def update_chunk(
        self,
        recruiter: AuthenticatedRecruiter,
        chunk_id: str,
        payload: CandidateChunkUpdateRequest,
    ) -> CandidateChunkResponse:
        update_payload = payload.model_dump(exclude_unset=True)
        if "content" in update_payload and update_payload["content"] is not None:
            update_payload["embedding"] = self._embedding_service.embed_query(update_payload["content"])

        record = self._chunk_repository.update_chunk(
            access_token=recruiter.access_token,
            recruiter_id=recruiter.id,
            chunk_id=chunk_id,
            payload=update_payload,
        )
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chunk not found.")
        return CandidateChunkResponse.from_record(record)

    def delete_chunk(
        self,
        recruiter: AuthenticatedRecruiter,
        chunk_id: str,
    ) -> None:
        deleted = self._chunk_repository.delete_chunk(
            access_token=recruiter.access_token,
            recruiter_id=recruiter.id,
            chunk_id=chunk_id,
        )
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chunk not found.")

    def search_chunks(
        self,
        recruiter: AuthenticatedRecruiter,
        payload: CandidateChunkSearchRequest,
    ) -> list[CandidateChunkSearchResult]:
        rows = self._chunk_repository.search_chunks(
            access_token=recruiter.access_token,
            recruiter_id=recruiter.id,
            query_embedding=self._embedding_service.embed_query(payload.query),
            limit=payload.top_k,
            candidate_ids=payload.candidate_ids,
        )
        return [CandidateChunkSearchResult.from_record(row) for row in rows]
