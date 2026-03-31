from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request, Response, status

from app.auth.dependencies import get_current_recruiter
from app.auth.service import AuthenticatedRecruiter
from app.models.schemas import (
    CandidateChunkCreateRequest,
    CandidateChunkResponse,
    CandidateChunkSearchRequest,
    CandidateChunkSearchResult,
    CandidateChunkUpdateRequest,
)
from app.services.chunk_service import ChunkService

router = APIRouter(prefix="/chunks", tags=["Chunks"])


@router.get("", response_model=list[CandidateChunkResponse])
def list_chunks(
    request: Request,
    response: Response,
    candidate_id: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_recruiter: AuthenticatedRecruiter = Depends(get_current_recruiter),
) -> list[CandidateChunkResponse]:
    """List recruiter-owned chunks with pagination."""
    chunk_service: ChunkService = request.app.state.chunk_service
    chunks, total = chunk_service.list_chunks(
        recruiter=current_recruiter,
        candidate_id=candidate_id,
        limit=limit,
        offset=offset,
    )
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Limit"] = str(limit)
    response.headers["X-Offset"] = str(offset)
    return chunks


@router.get("/{chunk_id}", response_model=CandidateChunkResponse)
def get_chunk(
    chunk_id: str,
    request: Request,
    current_recruiter: AuthenticatedRecruiter = Depends(get_current_recruiter),
) -> CandidateChunkResponse:
    """Return a single recruiter-owned chunk."""
    chunk_service: ChunkService = request.app.state.chunk_service
    return chunk_service.get_chunk(recruiter=current_recruiter, chunk_id=chunk_id)


@router.post("", response_model=CandidateChunkResponse, status_code=status.HTTP_201_CREATED)
def create_chunk(
    payload: CandidateChunkCreateRequest,
    request: Request,
    current_recruiter: AuthenticatedRecruiter = Depends(get_current_recruiter),
) -> CandidateChunkResponse:
    """Create a recruiter-owned chunk and persist its embedding to pgvector."""
    chunk_service: ChunkService = request.app.state.chunk_service
    return chunk_service.create_chunk(recruiter=current_recruiter, payload=payload)


@router.patch("/{chunk_id}", response_model=CandidateChunkResponse)
def update_chunk(
    chunk_id: str,
    payload: CandidateChunkUpdateRequest,
    request: Request,
    current_recruiter: AuthenticatedRecruiter = Depends(get_current_recruiter),
) -> CandidateChunkResponse:
    """Update chunk content or metadata and re-embed when content changes."""
    chunk_service: ChunkService = request.app.state.chunk_service
    return chunk_service.update_chunk(
        recruiter=current_recruiter,
        chunk_id=chunk_id,
        payload=payload,
    )


@router.delete("/{chunk_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chunk(
    chunk_id: str,
    request: Request,
    current_recruiter: AuthenticatedRecruiter = Depends(get_current_recruiter),
) -> None:
    """Delete a recruiter-owned chunk."""
    chunk_service: ChunkService = request.app.state.chunk_service
    chunk_service.delete_chunk(recruiter=current_recruiter, chunk_id=chunk_id)


@router.post("/search", response_model=list[CandidateChunkSearchResult])
def search_chunks(
    payload: CandidateChunkSearchRequest,
    request: Request,
    current_recruiter: AuthenticatedRecruiter = Depends(get_current_recruiter),
) -> list[CandidateChunkSearchResult]:
    """Search recruiter-owned CV chunks using pgvector similarity."""
    chunk_service: ChunkService = request.app.state.chunk_service
    return chunk_service.search_chunks(recruiter=current_recruiter, payload=payload)
