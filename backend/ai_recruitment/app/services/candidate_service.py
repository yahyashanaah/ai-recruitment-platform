from __future__ import annotations

from fastapi import HTTPException, status

from app.auth.service import AuthenticatedRecruiter
from app.models.schemas import CandidateProfileResponse, CandidateUpdateRequest, DeleteCandidateResponse, DeleteFileResponse
from app.repositories.candidates import CandidateRepository
from app.repositories.chunks import ChunkRepository
from app.services.embedding_service import EmbeddingService


class CandidateService:
    """Candidate read, filter, hybrid search, and delete operations."""

    def __init__(
        self,
        candidate_repository: CandidateRepository,
        chunk_repository: ChunkRepository,
        embedding_service: EmbeddingService,
    ) -> None:
        self._candidate_repository = candidate_repository
        self._chunk_repository = chunk_repository
        self._embedding_service = embedding_service

    def list_candidates(
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
            semantic_hits = self._chunk_repository.search_chunks(
                access_token=recruiter.access_token,
                recruiter_id=recruiter.id,
                query_embedding=self._embedding_service.embed_query(query),
                limit=max(limit * 5, 25),
            )
            candidate_ids = self._ordered_candidate_ids(semantic_hits)
            if not candidate_ids:
                return [], 0

        rows, total = self._candidate_repository.list_candidates(
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
