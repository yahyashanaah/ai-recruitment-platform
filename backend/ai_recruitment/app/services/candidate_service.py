from __future__ import annotations

import asyncio
from hashlib import sha1

from fastapi import HTTPException, status

from app.auth.service import AuthenticatedRecruiter
from app.core.cache import TTLCache
from app.models.schemas import CandidateProfileResponse, CandidateUpdateRequest, DeleteCandidateResponse, DeleteFileResponse
from app.repositories.candidates import CandidateRepository
from app.repositories.candidate_vector_search_repository import CandidateVectorSearchRepository
from app.repositories.chunks import ChunkRepository
from app.services.embedding_service import EmbeddingService


class CandidateService:
    """Candidate read, filter, hybrid search, and delete operations."""

    def __init__(
        self,
        candidate_repository: CandidateRepository,
        chunk_repository: ChunkRepository,
        vector_search_repository: CandidateVectorSearchRepository,
        embedding_service: EmbeddingService,
        search_cache_ttl_seconds: int,
    ) -> None:
        self._candidate_repository = candidate_repository
        self._chunk_repository = chunk_repository
        self._vector_search_repository = vector_search_repository
        self._embedding_service = embedding_service
        self._embedding_cache = TTLCache[str, list[float]](ttl_seconds=search_cache_ttl_seconds, max_size=1024)
        self._search_cache = TTLCache[tuple[str, str, int, str], list[str]](
            ttl_seconds=search_cache_ttl_seconds,
            max_size=2048,
        )

    async def list_candidates(
        self,
        recruiter: AuthenticatedRecruiter,
        *,
        limit: int,
        offset: int,
        skills: list[str] | None = None,
        min_experience: float | None = None,
        location: str | None = None,
        education: str | None = None,
        certifications: list[str] | None = None,
        query: str | None = None,
    ) -> tuple[list[CandidateProfileResponse], int]:
        candidate_ids: list[str] | None = None

        if query:
            filtered_candidate_ids: list[str] | None = None
            if any([skills, min_experience is not None, location, education, certifications]):
                filtered_candidate_ids = await asyncio.to_thread(
                    self._candidate_repository.list_candidate_ids,
                    access_token=recruiter.access_token,
                    recruiter_id=recruiter.id,
                    skills=skills,
                    min_experience=min_experience,
                    location=location,
                    education=education,
                    certifications=certifications,
                )
                if not filtered_candidate_ids:
                    return [], 0

            candidate_ids = await self._semantic_candidate_ids(
                recruiter=recruiter,
                query=query,
                limit=max(limit * 5, 25),
                candidate_ids=filtered_candidate_ids,
            )
            if not candidate_ids:
                return [], 0

        rows, total = await asyncio.to_thread(
            self._candidate_repository.list_candidates,
            access_token=recruiter.access_token,
            recruiter_id=recruiter.id,
            limit=limit,
            offset=offset,
            skills=skills,
            min_experience=min_experience,
            location=location,
            education=education,
            certifications=certifications,
            candidate_ids=candidate_ids,
        )
        return [CandidateProfileResponse.from_record(row) for row in rows], total

    def get_candidate(
        self,
        recruiter: AuthenticatedRecruiter,
        candidate_id: str,
    ) -> CandidateProfileResponse:
        record = self._candidate_repository.get_candidate(
            access_token=recruiter.access_token,
            recruiter_id=recruiter.id,
            candidate_id=candidate_id,
        )
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")
        return CandidateProfileResponse.from_record(record)

    def update_candidate(
        self,
        recruiter: AuthenticatedRecruiter,
        candidate_id: str,
        payload: CandidateUpdateRequest,
    ) -> CandidateProfileResponse:
        record = self._candidate_repository.update_candidate(
            access_token=recruiter.access_token,
            recruiter_id=recruiter.id,
            candidate_id=candidate_id,
            payload=payload.model_dump(exclude_unset=True),
        )
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")
        return CandidateProfileResponse.from_record(record)

    def delete_candidate(
        self,
        recruiter: AuthenticatedRecruiter,
        candidate_id: str,
    ) -> DeleteCandidateResponse:
        deleted_chunks = self._chunk_repository.count_chunks_for_candidate(
            access_token=recruiter.access_token,
            recruiter_id=recruiter.id,
            candidate_id=candidate_id,
        )
        deleted = self._candidate_repository.delete_candidate(
            access_token=recruiter.access_token,
            recruiter_id=recruiter.id,
            candidate_id=candidate_id,
        )
        return DeleteCandidateResponse(
            candidate_id=candidate_id,
            deleted=deleted,
            deleted_chunks=deleted_chunks if deleted else 0,
        )

    def delete_file(
        self,
        recruiter: AuthenticatedRecruiter,
        file_name: str,
    ) -> DeleteFileResponse:
        candidates, _ = self._candidate_repository.list_candidates(
            access_token=recruiter.access_token,
            recruiter_id=recruiter.id,
            limit=500,
            offset=0,
            file_name=file_name,
        )
        deleted_chunks = sum(
            self._chunk_repository.count_chunks_for_candidate(
                access_token=recruiter.access_token,
                recruiter_id=recruiter.id,
                candidate_id=str(row["id"]),
            )
            for row in candidates
        )
        deleted_candidates = self._candidate_repository.delete_candidates_by_file_name(
            access_token=recruiter.access_token,
            recruiter_id=recruiter.id,
            file_name=file_name,
        )
        return DeleteFileResponse(
            file_name=file_name,
            deleted_candidates=deleted_candidates,
            deleted_chunks=deleted_chunks if deleted_candidates else 0,
        )

    async def _semantic_candidate_ids(
        self,
        *,
        recruiter: AuthenticatedRecruiter,
        query: str,
        limit: int,
        candidate_ids: list[str] | None,
    ) -> list[str]:
        normalized_query = self._normalize_query(query)
        cache_key = (
            recruiter.id,
            normalized_query,
            limit,
            self._candidate_filter_signature(candidate_ids),
        )
        cached = self._search_cache.get(cache_key)
        if cached is not None:
            return cached

        embedding = await self._cached_embedding(normalized_query)

        if self._vector_search_repository.enabled:
            vector_hits = await self._vector_search_repository.search_candidates_by_embedding(
                recruiter_id=recruiter.id,
                query_embedding=embedding,
                limit=limit,
                candidate_ids=candidate_ids,
            )
            ordered_ids = [str(hit["candidate_id"]) for hit in vector_hits]
        else:
            semantic_hits = await asyncio.to_thread(
                self._chunk_repository.search_chunks,
                access_token=recruiter.access_token,
                recruiter_id=recruiter.id,
                query_embedding=embedding,
                limit=limit,
                candidate_ids=candidate_ids,
            )
            ordered_ids = self._ordered_candidate_ids(semantic_hits)

        self._search_cache.set(cache_key, ordered_ids)
        return ordered_ids

    async def _cached_embedding(self, normalized_query: str) -> list[float]:
        cached = self._embedding_cache.get(normalized_query)
        if cached is not None:
            return cached

        embedding = await self._embedding_service.embed_query_async(normalized_query)
        self._embedding_cache.set(normalized_query, embedding)
        return embedding

    @staticmethod
    def _normalize_query(value: str) -> str:
        return " ".join(value.strip().lower().split())

    @staticmethod
    def _candidate_filter_signature(candidate_ids: list[str] | None) -> str:
        if not candidate_ids:
            return "*"
        digest = sha1(",".join(sorted(candidate_ids)).encode("utf-8"), usedforsecurity=False)
        return digest.hexdigest()

    @staticmethod
    def _ordered_candidate_ids(matches: list[dict[str, object]]) -> list[str]:
        ordered: list[str] = []
        seen: set[str] = set()
        for match in matches:
            candidate_id = str(match.get("candidate_id") or "")
            if not candidate_id or candidate_id in seen:
                continue
            seen.add(candidate_id)
            ordered.append(candidate_id)
        return ordered
